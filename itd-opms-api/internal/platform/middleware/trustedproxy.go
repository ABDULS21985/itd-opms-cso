package middleware

import (
	"net"
	"net/http"
	"strings"
)

// trustedCIDRs defines the private/internal IP ranges whose X-Forwarded-For
// and X-Real-IP headers should be trusted for client IP extraction.
var trustedCIDRs = []string{
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	"127.0.0.0/8",
	"::1/128",
}

// TrustedRealIP extracts the real client IP address, only trusting
// X-Forwarded-For and X-Real-IP headers when the request comes from a
// known internal/private network. This prevents IP spoofing attacks that
// can bypass rate limiting and falsify audit logs.
func TrustedRealIP(next http.Handler) http.Handler {
	nets := parseCIDRs(trustedCIDRs)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		remoteHost, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			// If SplitHostPort fails, try using RemoteAddr directly.
			remoteHost = r.RemoteAddr
		}

		if isTrustedIP(remoteHost, nets) {
			// Trust proxy headers only from known internal sources.
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				// Use the first (leftmost) IP in the chain — the original client.
				ip := strings.TrimSpace(strings.SplitN(xff, ",", 2)[0])
				if ip != "" {
					r.RemoteAddr = ip + ":0"
				}
			} else if xri := r.Header.Get("X-Real-IP"); xri != "" {
				r.RemoteAddr = strings.TrimSpace(xri) + ":0"
			}
		}
		// If not from a trusted proxy, RemoteAddr is left as-is (the actual
		// TCP connection source), and X-Forwarded-For / X-Real-IP are ignored.

		next.ServeHTTP(w, r)
	})
}

// parseCIDRs converts CIDR strings into *net.IPNet values for fast matching.
func parseCIDRs(cidrs []string) []*net.IPNet {
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, cidr := range cidrs {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err == nil {
			nets = append(nets, ipNet)
		}
	}
	return nets
}

// isTrustedIP checks whether the given IP string belongs to one of the
// trusted CIDR ranges.
func isTrustedIP(ip string, trusted []*net.IPNet) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	for _, n := range trusted {
		if n.Contains(parsed) {
			return true
		}
	}
	return false
}
