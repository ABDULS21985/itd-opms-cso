package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"

	"github.com/itd-cbn/itd-opms-api/internal/modules/cmdb"
	"github.com/itd-cbn/itd-opms-api/internal/modules/governance"
	"github.com/itd-cbn/itd-opms-api/internal/modules/grc"
	"github.com/itd-cbn/itd-opms-api/internal/modules/itsm"
	"github.com/itd-cbn/itd-opms-api/internal/modules/knowledge"
	"github.com/itd-cbn/itd-opms-api/internal/modules/people"
	"github.com/itd-cbn/itd-opms-api/internal/modules/planning"
	"github.com/itd-cbn/itd-opms-api/internal/modules/reporting"
	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/dirsync"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/platform/msgraph"
	"github.com/itd-cbn/itd-opms-api/internal/platform/notification"
)

// Server holds all dependencies and provides the HTTP server functionality.
type Server struct {
	cfg      *config.Config
	pool     *pgxpool.Pool
	redis    *redis.Client
	minio    *minio.Client
	natsConn *nats.Conn
	js       nats.JetStreamContext
	router   chi.Router

	// Background services for graceful shutdown.
	outboxProcessor *notification.OutboxProcessor
	orchestrator    *notification.Orchestrator
}

// NewServer creates a new Server with all required dependencies.
func NewServer(
	cfg *config.Config,
	pool *pgxpool.Pool,
	redisClient *redis.Client,
	minioClient *minio.Client,
	natsConn *nats.Conn,
	js nats.JetStreamContext,
) *Server {
	return &Server{
		cfg:      cfg,
		pool:     pool,
		redis:    redisClient,
		minio:    minioClient,
		natsConn: natsConn,
		js:       js,
	}
}

// Setup configures the chi router with the full middleware chain and all
// route groups, including Microsoft 365 integration services.
func (s *Server) Setup() {
	r := chi.NewRouter()

	// --- Global middleware chain ---
	r.Use(middleware.Recovery)
	r.Use(middleware.Correlation)
	r.Use(middleware.Logging)
	r.Use(chimiddleware.RealIP)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173", "https://*.itd-opms.gov.ph"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Correlation-ID", "X-Tenant-ID"},
		ExposedHeaders:   []string{"X-Correlation-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	if s.redis != nil {
		r.Use(middleware.RateLimitByIP(s.redis, 100, 1*time.Minute))
	}

	// --- Core services ---
	authService := auth.NewAuthService(s.pool, s.cfg.JWT)
	authHandler := auth.NewAuthHandler(authService)
	auditService := audit.NewAuditService(s.pool)
	auditHandler := audit.NewAuditHandler(auditService)
	healthHandler := NewHealthHandler(s.pool, s.redis, s.natsConn, s.minio)

	// --- Microsoft Graph API client (if Entra ID is enabled) ---
	var graphClient *msgraph.Client
	if s.cfg.EntraID.Enabled && s.cfg.EntraID.ClientID != "" {
		graphClient = msgraph.NewClient(s.cfg.EntraID, s.cfg.Graph)
		slog.Info("Microsoft Graph API client initialized")
	}

	// --- OIDC Validator (for Entra ID token validation) ---
	var oidcValidator *auth.OIDCValidator
	var oidcHandler *auth.OIDCHandler
	if s.cfg.EntraID.Enabled && s.cfg.EntraID.TenantID != "" {
		oidcValidator = auth.NewOIDCValidator(s.cfg.EntraID)
		oidcHandler = auth.NewOIDCHandler(s.cfg.EntraID, s.pool, oidcValidator)
		slog.Info("Entra ID OIDC authentication enabled",
			"tenant_id", s.cfg.EntraID.TenantID,
		)
	}

	// --- Auth middleware config (dual-mode: Entra ID + dev JWT) ---
	authMiddlewareCfg := middleware.AuthConfig{
		JWTSecret:      s.cfg.JWT.Secret,
		EntraIDEnabled: s.cfg.EntraID.Enabled,
		OIDCValidator:  oidcValidator,
		Pool:           s.pool,
	}

	// --- Notification service ---
	notifService := notification.NewService(s.pool, graphClient)
	notifHandler := notification.NewHandler(notifService)
	sseHandler := notification.NewSSEHandler(notifService)

	// --- Directory sync service ---
	var dirSyncService *dirsync.Service
	if graphClient != nil {
		dirSyncService = dirsync.NewService(s.pool, graphClient, auditService)
		slog.Info("directory sync service initialized")
	}

	// --- Notification outbox processor ---
	outboxProcessor := notification.NewOutboxProcessor(s.pool, graphClient)
	s.outboxProcessor = outboxProcessor

	// --- Notification orchestrator (NATS event listener) ---
	if s.js != nil {
		orchestrator := notification.NewOrchestrator(notifService, s.js)
		s.orchestrator = orchestrator
	}

	// --- Module stub handlers ---
	governanceHandler := governance.NewHandler(s.pool, auditService)
	peopleHandler := people.NewHandler()
	planningHandler := planning.NewHandler(s.pool, auditService)
	itsmHandler := itsm.NewHandler()
	cmdbHandler := cmdb.NewHandler()
	knowledgeHandler := knowledge.NewHandler()
	grcHandler := grc.NewHandler()
	reportingHandler := reporting.NewHandler()

	// --- Routes ---
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes (no authentication required).
		r.Group(func(r chi.Router) {
			r.Use(middleware.PublicRoute)
			healthHandler.Routes(r)
		})

		// Auth routes — mixed public/protected.
		r.Route("/auth", func(r chi.Router) {
			// Public: login, refresh, OIDC config.
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)

			// OIDC routes (public, used by frontend PKCE flow).
			if oidcHandler != nil {
				r.Get("/oidc/config", oidcHandler.OIDCConfig)
				r.Post("/oidc/callback", oidcHandler.ExchangeCode)
				r.Post("/oidc/refresh", oidcHandler.RefreshOIDCToken)
			} else {
				// Return a disabled response if OIDC is not configured.
				r.Get("/oidc/config", func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					json.NewEncoder(w).Encode(map[string]any{
						"status": "success",
						"data":   map[string]any{"enabled": false},
					})
				})
			}

			// Protected auth endpoints.
			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthDualMode(authMiddlewareCfg))
				r.Get("/me", authHandler.Me)
				r.Post("/logout", authHandler.Logout)
			})
		})

		// Protected routes (require authentication).
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthDualMode(authMiddlewareCfg))
			r.Use(audit.AuditMiddleware(auditService))

			// Audit module.
			r.Route("/audit", func(r chi.Router) {
				auditHandler.Routes(r)
			})

			// Notification module.
			r.Route("/notifications", func(r chi.Router) {
				notifHandler.Routes(r)

				// SSE stream endpoint (long-lived connection).
				r.Get("/stream", sseHandler.ServeHTTP)
			})

			// Directory sync (admin only).
			if dirSyncService != nil {
				r.Route("/admin/directory-sync", func(r chi.Router) {
					r.Post("/run", func(w http.ResponseWriter, r *http.Request) {
						result, err := dirSyncService.RunSync(r.Context())
						if err != nil {
							w.Header().Set("Content-Type", "application/json")
							w.WriteHeader(http.StatusInternalServerError)
							json.NewEncoder(w).Encode(map[string]any{
								"status": "error",
								"errors": []map[string]string{{"code": "SYNC_FAILED", "message": err.Error()}},
							})
							return
						}
						w.Header().Set("Content-Type", "application/json")
						json.NewEncoder(w).Encode(map[string]any{
							"status": "success",
							"data":   result,
						})
					})
					r.Get("/status", func(w http.ResponseWriter, r *http.Request) {
						run, err := dirSyncService.GetLastSyncRun(r.Context())
						if err != nil {
							w.Header().Set("Content-Type", "application/json")
							w.WriteHeader(http.StatusNotFound)
							json.NewEncoder(w).Encode(map[string]any{
								"status": "error",
								"errors": []map[string]string{{"code": "NOT_FOUND", "message": "No sync runs found"}},
							})
							return
						}
						w.Header().Set("Content-Type", "application/json")
						json.NewEncoder(w).Encode(map[string]any{
							"status": "success",
							"data":   run,
						})
					})
				})
			}

			// Domain module stubs.
			r.Route("/governance", func(r chi.Router) { governanceHandler.Routes(r) })
			r.Route("/people", func(r chi.Router) { peopleHandler.Routes(r) })
			r.Route("/planning", func(r chi.Router) { planningHandler.Routes(r) })
			r.Route("/itsm", func(r chi.Router) { itsmHandler.Routes(r) })
			r.Route("/cmdb", func(r chi.Router) { cmdbHandler.Routes(r) })
			r.Route("/knowledge", func(r chi.Router) { knowledgeHandler.Routes(r) })
			r.Route("/grc", func(r chi.Router) { grcHandler.Routes(r) })
			r.Route("/reporting", func(r chi.Router) { reportingHandler.Routes(r) })
		})
	})

	s.router = r
}

// Start launches the HTTP server, background services, and blocks until a
// shutdown signal is received.
func (s *Server) Start() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start background services.
	if s.outboxProcessor != nil {
		s.outboxProcessor.Start(ctx)
	}
	if s.orchestrator != nil {
		if err := s.orchestrator.Start(ctx); err != nil {
			slog.Error("failed to start notification orchestrator", "error", err)
		}
	}

	addr := s.cfg.ListenAddr()
	srv := &http.Server{
		Addr:              addr,
		Handler:           s.router,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      0, // Disabled for SSE long-lived connections.
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("HTTP server starting", "addr", addr, "env", s.cfg.Server.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- fmt.Errorf("server listen: %w", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-quit:
		slog.Info("shutdown signal received", "signal", sig.String())
	}

	// Stop background services.
	cancel()
	if s.outboxProcessor != nil {
		s.outboxProcessor.Stop()
	}
	if s.orchestrator != nil {
		s.orchestrator.Stop()
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	slog.Info("shutting down HTTP server...")
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}

	slog.Info("HTTP server stopped gracefully")
	return nil
}

// jsonEncoder returns a new JSON encoder writing to w.
func jsonEncoder(w http.ResponseWriter) *json.Encoder {
	return json.NewEncoder(w)
}
