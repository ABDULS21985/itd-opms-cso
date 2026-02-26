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
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
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
// route groups.
func (s *Server) Setup() {
	r := chi.NewRouter()

	// --- Global middleware chain ---
	// 1. Recovery must be first to catch panics from all downstream handlers.
	r.Use(middleware.Recovery)

	// 2. Correlation ID for request tracing.
	r.Use(middleware.Correlation)

	// 3. Request logging.
	r.Use(middleware.Logging)

	// 4. Chi built-in real IP detection.
	r.Use(chimiddleware.RealIP)

	// 5. CORS configuration for frontend origins.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173", "https://*.itd-opms.gov.ph"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Correlation-ID", "X-Tenant-ID"},
		ExposedHeaders:   []string{"X-Correlation-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// 6. Rate limiter (if Redis is available).
	if s.redis != nil {
		r.Use(middleware.RateLimitByIP(s.redis, 100, 1*time.Minute))
	}

	// --- Services ---
	auditService := audit.NewAuditService(s.pool)
	auditHandler := audit.NewAuditHandler(auditService)
	healthHandler := NewHealthHandler(s.pool, s.redis, s.natsConn, s.minio)

	// --- Module stub handlers ---
	governanceHandler := governance.NewHandler()
	peopleHandler := people.NewHandler()
	planningHandler := planning.NewHandler()
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
			r.Route("/auth", func(r chi.Router) {
				r.Get("/login", placeholderHandler("auth login"))
				r.Post("/login", placeholderHandler("auth login"))
				r.Post("/refresh", placeholderHandler("auth refresh"))
			})
		})

		// Protected routes (require authentication).
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(s.cfg.JWT.Secret))
			r.Use(audit.AuditMiddleware(auditService))

			// Auth management (protected).
			r.Route("/auth", func(r chi.Router) {
				r.Get("/me", placeholderHandler("auth me"))
				r.Post("/logout", placeholderHandler("auth logout"))
			})

			// Audit module.
			r.Route("/audit", func(r chi.Router) {
				auditHandler.Routes(r)
			})

			// Domain module stubs.
			r.Route("/governance", func(r chi.Router) {
				governanceHandler.Routes(r)
			})
			r.Route("/people", func(r chi.Router) {
				peopleHandler.Routes(r)
			})
			r.Route("/planning", func(r chi.Router) {
				planningHandler.Routes(r)
			})
			r.Route("/itsm", func(r chi.Router) {
				itsmHandler.Routes(r)
			})
			r.Route("/cmdb", func(r chi.Router) {
				cmdbHandler.Routes(r)
			})
			r.Route("/knowledge", func(r chi.Router) {
				knowledgeHandler.Routes(r)
			})
			r.Route("/grc", func(r chi.Router) {
				grcHandler.Routes(r)
			})
			r.Route("/reporting", func(r chi.Router) {
				reportingHandler.Routes(r)
			})
		})
	})

	s.router = r
}

// Start launches the HTTP server and blocks until a shutdown signal is
// received (SIGINT or SIGTERM). Graceful shutdown drains active connections
// with a 30-second timeout.
func (s *Server) Start() error {
	addr := s.cfg.ListenAddr()

	srv := &http.Server{
		Addr:              addr,
		Handler:           s.router,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Channel to capture server errors.
	errCh := make(chan error, 1)

	go func() {
		slog.Info("HTTP server starting", "addr", addr, "env", s.cfg.Server.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- fmt.Errorf("server listen: %w", err)
		}
	}()

	// Wait for interrupt signal or server error.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-quit:
		slog.Info("shutdown signal received", "signal", sig.String())
	}

	// Graceful shutdown with timeout.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	slog.Info("shutting down HTTP server...")
	if err := srv.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}

	slog.Info("HTTP server stopped gracefully")
	return nil
}

// placeholderHandler returns an HTTP handler that responds with a JSON message
// indicating the endpoint is a placeholder. This is used for auth routes that
// are being implemented by another agent.
func placeholderHandler(name string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "info",
			"message": name + " - not yet implemented",
			"data":    nil,
		})
	}
}

// jsonEncoder returns a new JSON encoder writing to w. This is a package-level
// helper used by health.go.
func jsonEncoder(w http.ResponseWriter) *json.Encoder {
	return json.NewEncoder(w)
}
