package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all application configuration.
type Config struct {
	Server        ServerConfig
	Database      DatabaseConfig
	Redis         RedisConfig
	MinIO         MinIOConfig
	NATS          NATSConfig
	JWT           JWTConfig
	EntraID       EntraIDConfig
	Graph         GraphConfig
	Observability ObservabilityConfig
	Log           LogConfig
}

type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
	Env  string `mapstructure:"env"`
}

type DatabaseConfig struct {
	Host       string `mapstructure:"host"`
	Port       int    `mapstructure:"port"`
	User       string `mapstructure:"user"`
	Password   string `mapstructure:"password"`
	Name       string `mapstructure:"name"`
	SSLMode    string `mapstructure:"sslmode"`
	MaxConns   int32  `mapstructure:"max_conns"`
	MinConns   int32  `mapstructure:"min_conns"`
	RLSEnabled bool   `mapstructure:"rls_enabled"`
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		d.User, d.Password, d.Host, d.Port, d.Name, d.SSLMode,
	)
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

type MinIOConfig struct {
	Endpoint         string `mapstructure:"endpoint"`
	AccessKey        string `mapstructure:"access_key"`
	SecretKey        string `mapstructure:"secret_key"`
	UseSSL           bool   `mapstructure:"use_ssl"`
	BucketEvidence   string `mapstructure:"bucket_evidence"`
	BucketAttachment string `mapstructure:"bucket_attachments"`
}

type NATSConfig struct {
	URL string `mapstructure:"url"`
}

type JWTConfig struct {
	Secret        string        `mapstructure:"secret"`
	Expiry        time.Duration `mapstructure:"expiry"`
	RefreshExpiry time.Duration `mapstructure:"refresh_expiry"`
}

type EntraIDConfig struct {
	TenantID     string `mapstructure:"tenant_id"`
	ClientID     string `mapstructure:"client_id"`
	ClientSecret string `mapstructure:"client_secret"`
	RedirectURI  string `mapstructure:"redirect_uri"`
	Enabled      bool   `mapstructure:"enabled"`
}

// Issuer returns the OIDC issuer URL for this Entra ID tenant.
func (e EntraIDConfig) Issuer() string {
	return fmt.Sprintf("https://login.microsoftonline.com/%s/v2.0", e.TenantID)
}

// JWKSURL returns the JWKS endpoint for token signature verification.
func (e EntraIDConfig) JWKSURL() string {
	return fmt.Sprintf("https://login.microsoftonline.com/%s/discovery/v2.0/keys", e.TenantID)
}

// AuthorizeURL returns the OAuth2 authorize endpoint.
func (e EntraIDConfig) AuthorizeURL() string {
	return fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/authorize", e.TenantID)
}

// TokenURL returns the OAuth2 token endpoint.
func (e EntraIDConfig) TokenURL() string {
	return fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", e.TenantID)
}

type GraphConfig struct {
	ServiceAccountID string `mapstructure:"service_account_id"`
}

type ObservabilityConfig struct {
	OTLPEndpoint string `mapstructure:"otlp_endpoint"`
	ServiceName  string `mapstructure:"service_name"`
}

type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

// Load reads configuration from .env file and environment variables.
func Load() (*Config, error) {
	v := viper.New()

	v.SetConfigFile(".env")
	v.SetConfigType("env")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Defaults
	v.SetDefault("SERVER_HOST", "0.0.0.0")
	v.SetDefault("SERVER_PORT", 8089)
	v.SetDefault("SERVER_ENV", "development")
	v.SetDefault("DB_HOST", "localhost")
	v.SetDefault("DB_PORT", 5432)
	v.SetDefault("DB_USER", "opms")
	v.SetDefault("DB_PASSWORD", "opms_secret")
	v.SetDefault("DB_NAME", "itd_opms")
	v.SetDefault("DB_SSLMODE", "disable")
	v.SetDefault("DB_MAX_CONNS", 25)
	v.SetDefault("DB_MIN_CONNS", 5)
	v.SetDefault("DB_RLS_ENABLED", false)
	v.SetDefault("REDIS_HOST", "localhost")
	v.SetDefault("REDIS_PORT", 6379)
	v.SetDefault("REDIS_PASSWORD", "")
	v.SetDefault("REDIS_DB", 0)
	v.SetDefault("MINIO_ENDPOINT", "localhost:9000")
	v.SetDefault("MINIO_ACCESS_KEY", "opms_minio")
	v.SetDefault("MINIO_SECRET_KEY", "opms_minio_secret")
	v.SetDefault("MINIO_USE_SSL", false)
	v.SetDefault("MINIO_BUCKET_EVIDENCE", "evidence-vault")
	v.SetDefault("MINIO_BUCKET_ATTACHMENTS", "attachments")
	v.SetDefault("NATS_URL", "nats://localhost:4222")
	v.SetDefault("JWT_SECRET", "dev-secret-change-in-production-minimum-32-chars!!")
	v.SetDefault("JWT_EXPIRY", "30m")
	v.SetDefault("JWT_REFRESH_EXPIRY", "168h")
	v.SetDefault("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")
	v.SetDefault("OTEL_SERVICE_NAME", "itd-opms-api")
	v.SetDefault("LOG_LEVEL", "debug")
	v.SetDefault("LOG_FORMAT", "json")

	// Entra ID / Microsoft 365
	v.SetDefault("ENTRA_TENANT_ID", "")
	v.SetDefault("ENTRA_CLIENT_ID", "")
	v.SetDefault("ENTRA_CLIENT_SECRET", "")
	v.SetDefault("ENTRA_REDIRECT_URI", "http://localhost:3000/auth/callback")
	v.SetDefault("ENTRA_ENABLED", false)

	// Microsoft Graph
	v.SetDefault("GRAPH_SERVICE_ACCOUNT_ID", "")

	// Read config file (ignore error if not found)
	_ = v.ReadInConfig()

	jwtExpiry, err := time.ParseDuration(v.GetString("JWT_EXPIRY"))
	if err != nil {
		jwtExpiry = 30 * time.Minute
	}

	refreshExpiry, err := time.ParseDuration(v.GetString("JWT_REFRESH_EXPIRY"))
	if err != nil {
		refreshExpiry = 7 * 24 * time.Hour
	}

	cfg := &Config{
		Server: ServerConfig{
			Host: v.GetString("SERVER_HOST"),
			Port: v.GetInt("SERVER_PORT"),
			Env:  v.GetString("SERVER_ENV"),
		},
		Database: DatabaseConfig{
			Host:       v.GetString("DB_HOST"),
			Port:       v.GetInt("DB_PORT"),
			User:       v.GetString("DB_USER"),
			Password:   v.GetString("DB_PASSWORD"),
			Name:       v.GetString("DB_NAME"),
			SSLMode:    v.GetString("DB_SSLMODE"),
			MaxConns:   v.GetInt32("DB_MAX_CONNS"),
			MinConns:   v.GetInt32("DB_MIN_CONNS"),
			RLSEnabled: v.GetBool("DB_RLS_ENABLED"),
		},
		Redis: RedisConfig{
			Host:     v.GetString("REDIS_HOST"),
			Port:     v.GetInt("REDIS_PORT"),
			Password: v.GetString("REDIS_PASSWORD"),
			DB:       v.GetInt("REDIS_DB"),
		},
		MinIO: MinIOConfig{
			Endpoint:         v.GetString("MINIO_ENDPOINT"),
			AccessKey:        v.GetString("MINIO_ACCESS_KEY"),
			SecretKey:        v.GetString("MINIO_SECRET_KEY"),
			UseSSL:           v.GetBool("MINIO_USE_SSL"),
			BucketEvidence:   v.GetString("MINIO_BUCKET_EVIDENCE"),
			BucketAttachment: v.GetString("MINIO_BUCKET_ATTACHMENTS"),
		},
		NATS: NATSConfig{
			URL: v.GetString("NATS_URL"),
		},
		JWT: JWTConfig{
			Secret:        v.GetString("JWT_SECRET"),
			Expiry:        jwtExpiry,
			RefreshExpiry: refreshExpiry,
		},
		EntraID: EntraIDConfig{
			TenantID:     v.GetString("ENTRA_TENANT_ID"),
			ClientID:     v.GetString("ENTRA_CLIENT_ID"),
			ClientSecret: v.GetString("ENTRA_CLIENT_SECRET"),
			RedirectURI:  v.GetString("ENTRA_REDIRECT_URI"),
			Enabled:      v.GetBool("ENTRA_ENABLED"),
		},
		Graph: GraphConfig{
			ServiceAccountID: v.GetString("GRAPH_SERVICE_ACCOUNT_ID"),
		},
		Observability: ObservabilityConfig{
			OTLPEndpoint: v.GetString("OTEL_EXPORTER_OTLP_ENDPOINT"),
			ServiceName:  v.GetString("OTEL_SERVICE_NAME"),
		},
		Log: LogConfig{
			Level:  v.GetString("LOG_LEVEL"),
			Format: v.GetString("LOG_FORMAT"),
		},
	}

	return cfg, nil
}

// IsDevelopment returns true if running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.Server.Env == "development"
}

// ListenAddr returns the server listen address.
func (c *Config) ListenAddr() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}
