package email

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

/* ================================================================== */
/*  extractEmail                                                       */
/* ================================================================== */

func TestExtractEmail(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"name and angle brackets", "John Doe <john@example.com>", "john@example.com"},
		{"plain email", "alice@cbn.gov.ng", "alice@cbn.gov.ng"},
		{"quoted name", `"Jane Smith" <jane@cbn.gov.ng>`, "jane@cbn.gov.ng"},
		{"angle brackets only", "<noreply@itd.cbn.gov.ng>", "noreply@itd.cbn.gov.ng"},
		{"empty string", "", ""},
		{"no at sign", "not-an-email", ""},
		{"whitespace around", "  bob@example.com  ", "bob@example.com"},
		{"multiple angle brackets", "Foo <bar@x.com> <baz@y.com>", "baz@y.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractEmail(tt.input)
			if got != tt.want {
				t.Errorf("extractEmail(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

/* ================================================================== */
/*  stripQuotedReply                                                   */
/* ================================================================== */

func TestStripQuotedReply(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "no quoted text",
			input: "Hello, I need help with my account.",
			want:  "Hello, I need help with my account.",
		},
		{
			name:  "On ... wrote: marker",
			input: "Thanks for the update.\n\nOn Mon, Jan 5 2026 at 10:00, Support <support@cbn.gov.ng> wrote:\n> Previous message",
			want:  "Thanks for the update.",
		},
		{
			name:  "forwarded message marker",
			input: "FYI see below.\n\n---------- Forwarded message ----------\nFrom: someone@example.com",
			want:  "FYI see below.",
		},
		{
			name:  "quoted From header",
			input: "My reply here.\n\n> From: helpdesk@cbn.gov.ng\n> Subject: Your ticket",
			want:  "My reply here.",
		},
		{
			name:  "empty quoted lines removed",
			input: "My text.\n>\n> Some quote",
			want:  "My text.",
		},
		{
			name:  "all quoted",
			input: "> quoted line 1\n> quoted line 2",
			want:  "",
		},
		{
			name:  "empty body",
			input: "",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := stripQuotedReply(tt.input)
			if got != tt.want {
				t.Errorf("stripQuotedReply:\n  got:  %q\n  want: %q", got, tt.want)
			}
		})
	}
}

/* ================================================================== */
/*  stripHTML                                                          */
/* ================================================================== */

func TestStripHTML(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "simple tags",
			input: "<p>Hello <b>world</b></p>",
			want:  "Hello world",
		},
		{
			name:  "script removal",
			input: "Before<script>alert('xss')</script>After",
			want:  "BeforeAfter",
		},
		{
			name:  "style removal",
			input: "Before<style>body{color:red}</style>After",
			want:  "BeforeAfter",
		},
		{
			name:  "br to newline",
			input: "Line1<br>Line2<br/>Line3",
			want:  "Line1\nLine2\nLine3",
		},
		{
			name:  "entity decoding",
			input: "&amp; &lt; &gt; &quot; &#39; &nbsp;",
			want:  "& < > \" '",
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := stripHTML(tt.input)
			if got != tt.want {
				t.Errorf("stripHTML:\n  got:  %q\n  want: %q", got, tt.want)
			}
		})
	}
}

/* ================================================================== */
/*  ticketRefRe — regex matching                                       */
/* ================================================================== */

func TestTicketRefRegex(t *testing.T) {
	tests := []struct {
		name       string
		subject    string
		wantPrefix string
		wantNumber string
		wantMatch  bool
	}{
		{"incident ref", "RE: [INC-000123] Server down", "INC", "000123", true},
		{"service request ref", "Re: [SR-000456] New laptop", "SR", "000456", true},
		{"change ref", "[CHG-000789] Deployment window", "CHG", "000789", true},
		{"problem ref", "[PRB-000001] Root cause analysis", "PRB", "000001", true},
		{"no reference", "Help with my account", "", "", false},
		{"partial ref", "[INC-] missing number", "", "", false},
		{"wrong prefix", "[REQ-000123] Not a valid prefix", "", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			match := ticketRefRe.FindStringSubmatch(tt.subject)
			if tt.wantMatch {
				if len(match) != 3 {
					t.Fatalf("expected match for %q, got %v", tt.subject, match)
				}
				if match[1] != tt.wantPrefix {
					t.Errorf("prefix: got %q, want %q", match[1], tt.wantPrefix)
				}
				if match[2] != tt.wantNumber {
					t.Errorf("number: got %q, want %q", match[2], tt.wantNumber)
				}
			} else {
				if len(match) == 3 {
					t.Errorf("expected no match for %q, got %v", tt.subject, match)
				}
			}
		})
	}
}

/* ================================================================== */
/*  secureCompare                                                      */
/* ================================================================== */

func TestSecureCompare(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want bool
	}{
		{"equal strings", "secret123", "secret123", true},
		{"different strings", "secret123", "wrong456", false},
		{"empty vs non-empty", "", "something", false},
		{"both empty", "", "", true},
		{"different length", "short", "longerstring", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := secureCompare(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("secureCompare(%q, %q) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

/* ================================================================== */
/*  HandleInbound — webhook secret verification                        */
/* ================================================================== */

func TestHandleInbound_RejectsInvalidSecret(t *testing.T) {
	handler := &InboundHandler{
		emailCfg: config.InboundEmailConfig{
			WebhookSecret: "test-secret-123",
			Domain:        "itd.cbn.gov.ng",
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/webhooks/email/inbound", strings.NewReader(""))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=boundary")
	w := httptest.NewRecorder()

	handler.HandleInbound(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized, got %d", w.Code)
	}
}

func TestHandleInbound_AcceptsValidSecretInHeader(t *testing.T) {
	handler := &InboundHandler{
		emailCfg: config.InboundEmailConfig{
			WebhookSecret: "test-secret-123",
			Domain:        "itd.cbn.gov.ng",
		},
	}

	// Use a minimal multipart body — we just want to get past the secret check.
	body := "--boundary\r\nContent-Disposition: form-data; name=\"from\"\r\n\r\n\r\n--boundary--\r\n"
	req := httptest.NewRequest(http.MethodPost, "/webhooks/email/inbound", strings.NewReader(body))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=boundary")
	req.Header.Set("X-Webhook-Secret", "test-secret-123")
	w := httptest.NewRecorder()

	handler.HandleInbound(w, req)

	// Should NOT be 401 (accepted the secret).
	if w.Code == http.StatusUnauthorized {
		t.Errorf("expected secret to be accepted, got 401")
	}
}

func TestHandleInbound_AcceptsValidSecretInQuery(t *testing.T) {
	handler := &InboundHandler{
		emailCfg: config.InboundEmailConfig{
			WebhookSecret: "test-secret-123",
			Domain:        "itd.cbn.gov.ng",
		},
	}

	body := "--boundary\r\nContent-Disposition: form-data; name=\"from\"\r\n\r\n--boundary--\r\n"
	req := httptest.NewRequest(http.MethodPost, "/webhooks/email/inbound?secret=test-secret-123", strings.NewReader(body))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=boundary")
	w := httptest.NewRecorder()

	handler.HandleInbound(w, req)

	if w.Code == http.StatusUnauthorized {
		t.Errorf("expected secret to be accepted via query param, got 401")
	}
}

func TestHandleInbound_NoSecretConfigured_Allowed(t *testing.T) {
	handler := &InboundHandler{
		emailCfg: config.InboundEmailConfig{
			WebhookSecret: "",
			Domain:        "itd.cbn.gov.ng",
		},
	}

	body := "--boundary\r\nContent-Disposition: form-data; name=\"from\"\r\n\r\n\r\n--boundary--\r\n"
	req := httptest.NewRequest(http.MethodPost, "/webhooks/email/inbound", strings.NewReader(body))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=boundary")
	w := httptest.NewRecorder()

	handler.HandleInbound(w, req)

	// When no secret is configured, should not return 401.
	if w.Code == http.StatusUnauthorized {
		t.Errorf("expected no secret check when secret is empty, got 401")
	}
}
