package middleware

import (
	"net/http"
	"strings"
)

// CSRFProtection validates that mutation requests (POST, PUT, PATCH, DELETE)
// include a valid Origin or Referer header matching allowed origins.
// This prevents CSRF attacks on cookie-authenticated endpoints.
func CSRFProtection(allowedOrigins []string) func(http.Handler) http.Handler {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[strings.TrimRight(o, "/")] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Safe methods don't need CSRF protection
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			// Check Origin header first, fall back to Referer
			origin := r.Header.Get("Origin")
			if origin == "" {
				referer := r.Header.Get("Referer")
				if referer != "" {
					// Extract origin from referer URL
					if idx := strings.Index(referer, "://"); idx != -1 {
						rest := referer[idx+3:]
						if slashIdx := strings.Index(rest, "/"); slashIdx != -1 {
							origin = referer[:idx+3+slashIdx]
						} else {
							origin = referer
						}
					}
				}
			}

			origin = strings.TrimRight(origin, "/")

			// If no origin/referer, allow (API clients without browser won't have these)
			if origin == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Check against allowed origins
			if !originSet[origin] {
				http.Error(w, `{"status":"error","errors":[{"code":"CSRF_FAILED","message":"Cross-origin request blocked"}]}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
