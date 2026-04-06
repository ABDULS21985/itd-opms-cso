package middleware

import (
	"net/http"
	"time"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// SessionTimeout checks that the JWT token was issued within the configured
// timeout window (default 30 minutes). If expired, returns 401.
func SessionTimeout(timeout time.Duration) func(http.Handler) http.Handler {
	if timeout == 0 {
		timeout = 30 * time.Minute
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authCtx := types.GetAuthContext(r.Context())
			if authCtx != nil && !authCtx.IssuedAt.IsZero() {
				if time.Since(authCtx.IssuedAt) > timeout {
					types.ErrorMessage(w, http.StatusUnauthorized, "SESSION_EXPIRED",
						"Session has expired. Please re-authenticate.")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
