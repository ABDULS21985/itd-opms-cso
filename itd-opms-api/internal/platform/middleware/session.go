package middleware

import (
	"net/http"
	"time"
)

// SessionTimeout checks that the JWT token was issued within the configured
// timeout window (default 30 minutes). If expired, returns 401.
//
// NOTE: This middleware requires AuthContext to have an IssuedAt field.
// Currently AuthContext does not include IssuedAt, so this middleware acts as
// a pass-through. Once IssuedAt is added to AuthContext and populated by the
// auth middleware, uncomment the timeout check below.
func SessionTimeout(timeout time.Duration) func(http.Handler) http.Handler {
	if timeout == 0 {
		timeout = 30 * time.Minute
	}
	_ = timeout // will be used once AuthContext.IssuedAt is available
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// TODO: Enable session timeout once AuthContext has IssuedAt field.
			//
			// authCtx := types.GetAuthContext(r.Context())
			// if authCtx != nil && !authCtx.IssuedAt.IsZero() {
			//     if time.Since(authCtx.IssuedAt) > timeout {
			//         types.ErrorMessage(w, http.StatusUnauthorized, "SESSION_EXPIRED",
			//             "Session has expired. Please re-authenticate.")
			//         return
			//     }
			// }
			next.ServeHTTP(w, r)
		})
	}
}
