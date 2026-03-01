package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode  int
	wroteHeader bool
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.wroteHeader {
		rw.statusCode = code
		rw.wroteHeader = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.wroteHeader {
		rw.wroteHeader = true
	}
	return rw.ResponseWriter.Write(b)
}

// Unwrap returns the underlying ResponseWriter, allowing the standard library
// to detect optional interfaces (http.Flusher, http.Hijacker, etc.).
func (rw *responseWriter) Unwrap() http.ResponseWriter {
	return rw.ResponseWriter
}

// Flush implements http.Flusher by delegating to the underlying ResponseWriter.
// This is required for SSE (Server-Sent Events) connections.
func (rw *responseWriter) Flush() {
	if f, ok := rw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Logging is a middleware that logs structured information about every HTTP
// request and its response using slog. It records the method, path, status
// code, duration, remote address, and correlation ID.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := newResponseWriter(w)

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		correlationID := types.GetCorrelationID(r.Context())

		attrs := []slog.Attr{
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", wrapped.statusCode),
			slog.String("duration", duration.String()),
			slog.String("remote_addr", r.RemoteAddr),
			slog.String("correlation_id", correlationID),
		}

		level := slog.LevelInfo
		if wrapped.statusCode >= 500 {
			level = slog.LevelError
		} else if wrapped.statusCode >= 400 {
			level = slog.LevelWarn
		}

		slog.LogAttrs(r.Context(), level, "http request",
			attrs...,
		)
	})
}
