package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/database"
	"github.com/itd-cbn/itd-opms-api/internal/platform/server"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
)

func main() {
	if err := run(); err != nil {
		slog.Error("application failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	// --- Load configuration ---
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// --- Setup structured logging ---
	setupLogger(cfg)

	slog.Info("starting ITD-OPMS API",
		"env", cfg.Server.Env,
		"addr", cfg.ListenAddr(),
	)

	ctx := context.Background()

	// --- Connect to PostgreSQL (required, with retry) ---
	pool, err := connectPostgres(ctx, cfg)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	defer pool.Close()

	// --- Run database migrations ---
	if err := database.RunMigrations(ctx, pool, "./migrations"); err != nil {
		slog.Warn("database migrations failed (may not have migration files yet)", "error", err)
	}

	// --- Connect to Redis (optional, non-fatal if fails) ---
	redisClient := connectRedis(ctx, cfg)
	if redisClient != nil {
		defer func() {
			if err := redisClient.Close(); err != nil {
				slog.Warn("error closing Redis connection", "error", err)
			}
		}()
	}

	// --- Connect to MinIO (optional, non-fatal if fails) ---
	minioClient := connectMinIO(ctx, cfg)

	// --- Connect to NATS (optional, non-fatal if fails) ---
	natsConn, js := connectNATS(cfg)
	if natsConn != nil {
		defer natsConn.Close()
	}

	// --- Create and start server ---
	srv := server.NewServer(cfg, pool, redisClient, minioClient, natsConn, js)
	srv.Setup()

	slog.Info("all services wired, starting HTTP server")
	return srv.Start()
}

// setupLogger configures the global slog logger based on the configuration.
// JSON format is used for production; text format for development.
func setupLogger(cfg *config.Config) {
	var handler slog.Handler

	level := parseLogLevel(cfg.Log.Level)
	opts := &slog.HandlerOptions{Level: level}

	if cfg.IsDevelopment() || cfg.Log.Format == "text" {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
}

// parseLogLevel converts a string log level to a slog.Level.
func parseLogLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// connectPostgres establishes a connection to PostgreSQL with retry logic.
// This is a required dependency; the function will retry up to 5 times before
// returning an error.
func connectPostgres(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	var pool *pgxpool.Pool
	var err error

	for attempt := 1; attempt <= 5; attempt++ {
		pool, err = database.NewPostgresPool(ctx, cfg.Database)
		if err == nil {
			return pool, nil
		}

		slog.Warn("failed to connect to PostgreSQL, retrying...",
			"attempt", attempt,
			"max_attempts", 5,
			"error", err,
		)

		if attempt < 5 {
			time.Sleep(time.Duration(attempt) * 2 * time.Second)
		}
	}

	return nil, fmt.Errorf("could not connect to PostgreSQL after 5 attempts: %w", err)
}

// connectRedis establishes a connection to Redis with retry logic.
// This is an optional dependency; if connection fails the function returns nil
// and the application continues without Redis-dependent features.
func connectRedis(ctx context.Context, cfg *config.Config) *redis.Client {
	var client *redis.Client
	var err error

	for attempt := 1; attempt <= 3; attempt++ {
		client, err = database.NewRedisClient(ctx, cfg.Redis)
		if err == nil {
			return client
		}

		slog.Warn("failed to connect to Redis, retrying...",
			"attempt", attempt,
			"max_attempts", 3,
			"error", err,
		)

		if attempt < 3 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}

	slog.Warn("Redis unavailable, continuing without Redis",
		"error", err,
	)
	return nil
}

// connectMinIO establishes a connection to MinIO with retry logic.
// This is an optional dependency; if connection fails the function returns nil
// and the application continues without MinIO-dependent features.
func connectMinIO(ctx context.Context, cfg *config.Config) *minio.Client {
	var client *minio.Client
	var err error

	for attempt := 1; attempt <= 3; attempt++ {
		client, err = database.NewMinIOClient(ctx, cfg.MinIO)
		if err == nil {
			return client
		}

		slog.Warn("failed to connect to MinIO, retrying...",
			"attempt", attempt,
			"max_attempts", 3,
			"error", err,
		)

		if attempt < 3 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}

	slog.Warn("MinIO unavailable, continuing without MinIO",
		"error", err,
	)
	return nil
}

// connectNATS establishes a connection to NATS with retry logic.
// This is an optional dependency; if connection fails the function returns nil
// values and the application continues without NATS-dependent features.
func connectNATS(cfg *config.Config) (*nats.Conn, nats.JetStreamContext) {
	var nc *nats.Conn
	var js nats.JetStreamContext
	var err error

	for attempt := 1; attempt <= 3; attempt++ {
		nc, js, err = database.NewNATSConnection(cfg.NATS)
		if err == nil {
			return nc, js
		}

		slog.Warn("failed to connect to NATS, retrying...",
			"attempt", attempt,
			"max_attempts", 3,
			"error", err,
		)

		if attempt < 3 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}

	slog.Warn("NATS unavailable, continuing without NATS",
		"error", err,
	)
	return nil, nil
}
