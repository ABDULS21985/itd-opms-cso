package sendgrid

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

const apiURL = "https://api.sendgrid.com/v3/mail/send"

// Client sends transactional emails via the SendGrid v3 API.
type Client struct {
	apiKey    string
	fromEmail string
	fromName  string
	http      *http.Client
}

// NewClient creates a new SendGrid client from configuration.
func NewClient(cfg config.SendGridConfig) *Client {
	return &Client{
		apiKey:    cfg.APIKey,
		fromEmail: cfg.FromEmail,
		fromName:  cfg.FromName,
		http:      &http.Client{},
	}
}

// SendMail sends an HTML email to a single recipient.
func (c *Client) SendMail(ctx context.Context, to, subject, htmlBody string) error {
	payload := mailRequest{
		Personalizations: []personalization{
			{To: []emailAddr{{Email: to}}},
		},
		From:    emailAddr{Email: c.fromEmail, Name: c.fromName},
		Subject: subject,
		Content: []content{
			{Type: "text/html", Value: htmlBody},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal sendgrid payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create sendgrid request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("sendgrid request failed: %w", err)
	}
	defer resp.Body.Close()

	// 2xx = accepted for delivery
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		slog.Debug("sendgrid mail accepted", "to", to, "status", resp.StatusCode)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("sendgrid API error (HTTP %d): %s", resp.StatusCode, string(respBody))
}

// --- SendGrid v3 mail/send request types ---

type mailRequest struct {
	Personalizations []personalization `json:"personalizations"`
	From             emailAddr         `json:"from"`
	Subject          string            `json:"subject"`
	Content          []content         `json:"content"`
}

type personalization struct {
	To []emailAddr `json:"to"`
}

type emailAddr struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type content struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}
