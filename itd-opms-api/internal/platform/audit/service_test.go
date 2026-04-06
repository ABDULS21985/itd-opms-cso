package audit

import "testing"

func TestNormalizeIPAddress(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want string
	}{
		{name: "empty", raw: "", want: ""},
		{name: "ipv4", raw: "192.168.1.50", want: "192.168.1.50"},
		{name: "ipv4 with port", raw: "192.168.1.50:8080", want: "192.168.1.50"},
		{name: "ipv6", raw: "::1", want: "::1"},
		{name: "ipv6 with brackets and port", raw: "[::1]:8080", want: "::1"},
		{name: "invalid hostname", raw: "localhost", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeIPAddress(tt.raw); got != tt.want {
				t.Fatalf("normalizeIPAddress(%q) = %q, want %q", tt.raw, got, tt.want)
			}
		})
	}
}
