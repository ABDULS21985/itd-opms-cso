package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// Recovery is a middleware that catches panics from downstream handlers,
// logs the stack trace, and returns a 500 JSON error response instead of
// crashing the server.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				stack := debug.Stack()

				correlationID := types.GetCorrelationID(r.Context())

				slog.Error("panic recovered",
					"error", err,
					"stack", string(stack),
					"method", r.Method,
					"path", r.URL.Path,
					"correlation_id", correlationID,
				)

				types.ErrorMessage(w, http.StatusInternalServerError,
					"INTERNAL_ERROR", "An unexpected error occurred",
				)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
