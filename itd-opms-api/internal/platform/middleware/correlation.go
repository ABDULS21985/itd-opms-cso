package middleware

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const correlationHeader = "X-Correlation-ID"

// Correlation is a middleware that extracts or generates a correlation ID
// for every request. The ID is propagated via context and echoed in the
// response header so callers can trace requests through logs.
func Correlation(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		correlationID := r.Header.Get(correlationHeader)
		if correlationID == "" {
			correlationID = uuid.New().String()
		}

		// Set correlation ID in the response header.
		w.Header().Set(correlationHeader, correlationID)

		// Store correlation ID in the request context.
		ctx := types.SetCorrelationID(r.Context(), correlationID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
