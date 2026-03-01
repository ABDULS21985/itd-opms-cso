package database

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

// NewMinIOClient creates a new MinIO client and ensures required buckets exist.
func NewMinIOClient(ctx context.Context, cfg config.MinIOConfig) (*minio.Client, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}

	// Ensure required buckets exist
	buckets := []string{cfg.BucketEvidence, cfg.BucketAttachment}
	for _, bucket := range buckets {
		exists, err := client.BucketExists(ctx, bucket)
		if err != nil {
			return nil, fmt.Errorf("check bucket %s: %w", bucket, err)
		}
		if !exists {
			if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
				return nil, fmt.Errorf("create bucket %s: %w", bucket, err)
			}
			slog.Info("created MinIO bucket", "bucket", bucket)
		}
	}

	slog.Info("connected to MinIO", "endpoint", cfg.Endpoint)
	return client, nil
}
