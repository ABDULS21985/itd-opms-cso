package server

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
)

// ServiceStatus describes the health of an individual service dependency.
type ServiceStatus struct {
	Status  string `json:"status"`
	Latency string `json:"latency,omitempty"`
	Error   string `json:"error,omitempty"`
}

// HealthResponse is the top-level response for the health check endpoint.
type HealthResponse struct {
	Status   string                   `json:"status"`
	Version  string                   `json:"version"`
	Services map[string]ServiceStatus `json:"services"`
}

// HealthHandler provides a health check endpoint that reports on all
// infrastructure dependencies.
type HealthHandler struct {
	pool  *pgxpool.Pool
	redis *redis.Client
	nats  *nats.Conn
	minio *minio.Client
}

// NewHealthHandler creates a new HealthHandler. Any dependency may be nil if
// the service is unavailable; the handler will report it as "unavailable".
func NewHealthHandler(pool *pgxpool.Pool, redisClient *redis.Client, natsConn *nats.Conn, minioClient *minio.Client) *HealthHandler {
	return &HealthHandler{
		pool:  pool,
		redis: redisClient,
		nats:  natsConn,
		minio: minioClient,
	}
}

// Routes mounts the health check endpoint.
func (h *HealthHandler) Routes(r chi.Router) {
	r.Get("/health", h.healthCheck)
}

// healthCheck reports the health of all service dependencies.
func (h *HealthHandler) healthCheck(w http.ResponseWriter, r *http.Request) {
	services := make(map[string]ServiceStatus)
	overall := "healthy"

	// Check PostgreSQL.
	services["postgres"] = h.checkPostgres(r.Context())
	if services["postgres"].Status != "healthy" {
		overall = "degraded"
	}

	// Check Redis.
	services["redis"] = h.checkRedis(r.Context())
	if services["redis"].Status != "healthy" && services["redis"].Status != "unavailable" {
		overall = "degraded"
	}

	// Check NATS.
	services["nats"] = h.checkNATS()
	if services["nats"].Status != "healthy" && services["nats"].Status != "unavailable" {
		overall = "degraded"
	}

	// Check MinIO.
	services["minio"] = h.checkMinIO(r.Context())
	if services["minio"].Status != "healthy" && services["minio"].Status != "unavailable" {
		overall = "degraded"
	}

	resp := HealthResponse{
		Status:   overall,
		Version:  "0.1.0",
		Services: services,
	}

	status := http.StatusOK
	if overall != "healthy" {
		status = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	// Use the standard JSON encoder from the response types package.
	writeJSON(w, resp)
}

// checkPostgres pings the PostgreSQL database and returns its status.
func (h *HealthHandler) checkPostgres(ctx context.Context) ServiceStatus {
	if h.pool == nil {
		return ServiceStatus{Status: "unavailable", Error: "pool not configured"}
	}

	start := time.Now()
	err := h.pool.Ping(ctx)
	latency := time.Since(start)

	if err != nil {
		return ServiceStatus{
			Status:  "unhealthy",
			Latency: latency.String(),
			Error:   err.Error(),
		}
	}

	return ServiceStatus{
		Status:  "healthy",
		Latency: latency.String(),
	}
}

// checkRedis pings Redis and returns its status.
func (h *HealthHandler) checkRedis(ctx context.Context) ServiceStatus {
	if h.redis == nil {
		return ServiceStatus{Status: "unavailable"}
	}

	start := time.Now()
	err := h.redis.Ping(ctx).Err()
	latency := time.Since(start)

	if err != nil {
		return ServiceStatus{
			Status:  "unhealthy",
			Latency: latency.String(),
			Error:   err.Error(),
		}
	}

	return ServiceStatus{
		Status:  "healthy",
		Latency: latency.String(),
	}
}

// checkNATS checks the NATS connection status.
func (h *HealthHandler) checkNATS() ServiceStatus {
	if h.nats == nil {
		return ServiceStatus{Status: "unavailable"}
	}

	if h.nats.IsConnected() {
		return ServiceStatus{Status: "healthy"}
	}

	return ServiceStatus{
		Status: "unhealthy",
		Error:  "not connected",
	}
}

// checkMinIO verifies MinIO connectivity by listing buckets.
func (h *HealthHandler) checkMinIO(ctx context.Context) ServiceStatus {
	if h.minio == nil {
		return ServiceStatus{Status: "unavailable"}
	}

	start := time.Now()
	_, err := h.minio.ListBuckets(ctx)
	latency := time.Since(start)

	if err != nil {
		return ServiceStatus{
			Status:  "unhealthy",
			Latency: latency.String(),
			Error:   err.Error(),
		}
	}

	return ServiceStatus{
		Status:  "healthy",
		Latency: latency.String(),
	}
}

// writeJSON is a small helper to encode JSON to the response writer.
func writeJSON(w http.ResponseWriter, v any) {
	enc := jsonEncoder(w)
	_ = enc.Encode(v)
}
