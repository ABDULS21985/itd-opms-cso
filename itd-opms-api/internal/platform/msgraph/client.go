package msgraph

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

const graphBaseURL = "https://graph.microsoft.com/v1.0"

// Client provides authenticated access to the Microsoft Graph API.
// It uses client_credentials flow for application-level access.
type Client struct {
	cfg        config.EntraIDConfig
	graphCfg   config.GraphConfig
	httpClient *http.Client
	breaker    *CircuitBreaker

	tokenMu    sync.RWMutex
	token      string
	tokenExpAt time.Time
}

// NewClient creates a new Graph API client.
func NewClient(cfg config.EntraIDConfig, graphCfg config.GraphConfig) *Client {
	return &Client{
		cfg:      cfg,
		graphCfg: graphCfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		breaker: NewCircuitBreaker(5, 60*time.Second),
	}
}

// getAppToken retrieves or refreshes the app-only access token via client_credentials.
func (c *Client) getAppToken(ctx context.Context) (string, error) {
	c.tokenMu.RLock()
	if c.token != "" && time.Now().Before(c.tokenExpAt.Add(-2*time.Minute)) {
		token := c.token
		c.tokenMu.RUnlock()
		return token, nil
	}
	c.tokenMu.RUnlock()

	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	// Double-check after acquiring write lock.
	if c.token != "" && time.Now().Before(c.tokenExpAt.Add(-2*time.Minute)) {
		return c.token, nil
	}

	tokenURL := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", c.cfg.TenantID)

	data := url.Values{
		"client_id":     {c.cfg.ClientID},
		"client_secret": {c.cfg.ClientSecret},
		"grant_type":    {"client_credentials"},
		"scope":         {"https://graph.microsoft.com/.default"},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("decode token: %w", err)
	}

	c.token = tokenResp.AccessToken
	c.tokenExpAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)

	slog.Debug("acquired Graph API app token", "expires_in", tokenResp.ExpiresIn)
	return c.token, nil
}

// doRequest performs an authenticated Graph API request with circuit breaker protection.
func (c *Client) doRequest(ctx context.Context, method, path string, body any) (*http.Response, error) {
	if err := c.breaker.Allow(); err != nil {
		return nil, fmt.Errorf("circuit breaker open: %w", err)
	}

	token, err := c.getAppToken(ctx)
	if err != nil {
		c.breaker.RecordFailure()
		return nil, fmt.Errorf("get app token: %w", err)
	}

	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	fullURL := graphBaseURL + path
	req, err := http.NewRequestWithContext(ctx, method, fullURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.breaker.RecordFailure()
		return nil, fmt.Errorf("graph request: %w", err)
	}

	// Handle rate limiting.
	if resp.StatusCode == http.StatusTooManyRequests {
		c.breaker.RecordFailure()
		retryAfter := resp.Header.Get("Retry-After")
		return nil, &RateLimitError{RetryAfter: retryAfter}
	}

	// Transient server errors.
	if resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusGatewayTimeout {
		c.breaker.RecordFailure()
		return nil, fmt.Errorf("graph transient error: %d", resp.StatusCode)
	}

	c.breaker.RecordSuccess()
	return resp, nil
}

// Get performs a GET request to the Graph API.
func (c *Client) Get(ctx context.Context, path string) (*http.Response, error) {
	return c.doRequest(ctx, http.MethodGet, path, nil)
}

// Post performs a POST request to the Graph API.
func (c *Client) Post(ctx context.Context, path string, body any) (*http.Response, error) {
	return c.doRequest(ctx, http.MethodPost, path, body)
}

// RateLimitError indicates the Graph API returned 429.
type RateLimitError struct {
	RetryAfter string
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("graph API rate limited, retry after: %s", e.RetryAfter)
}

// ──────────────────────────────────────────────
// Graph API request/response types
// ──────────────────────────────────────────────

// SendMailRequest is the body for POST /users/{id}/sendMail.
type SendMailRequest struct {
	Message         MailMessage `json:"message"`
	SaveToSentItems bool        `json:"saveToSentItems"`
}

// MailMessage represents an email message in Graph API format.
type MailMessage struct {
	Subject      string           `json:"subject"`
	Body         MailBody         `json:"body"`
	ToRecipients []MailRecipient  `json:"toRecipients"`
	CCRecipients []MailRecipient  `json:"ccRecipients,omitempty"`
}

// MailBody represents the body content of an email.
type MailBody struct {
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
}

// MailRecipient represents an email recipient.
type MailRecipient struct {
	EmailAddress EmailAddress `json:"emailAddress"`
}

// EmailAddress is a name+address pair.
type EmailAddress struct {
	Name    string `json:"name,omitempty"`
	Address string `json:"address"`
}

// SendMail sends an email via Graph API using the service account.
func (c *Client) SendMail(ctx context.Context, to, subject, htmlBody string) error {
	serviceAccountID := c.graphCfg.ServiceAccountID
	if serviceAccountID == "" {
		return fmt.Errorf("GRAPH_SERVICE_ACCOUNT_ID not configured")
	}

	mail := SendMailRequest{
		Message: MailMessage{
			Subject: subject,
			Body: MailBody{
				ContentType: "HTML",
				Content:     htmlBody,
			},
			ToRecipients: []MailRecipient{
				{EmailAddress: EmailAddress{Address: to}},
			},
		},
		SaveToSentItems: false,
	}

	path := fmt.Sprintf("/users/%s/sendMail", serviceAccountID)
	resp, err := c.Post(ctx, path, mail)
	if err != nil {
		return fmt.Errorf("send mail: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sendMail returned %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// TeamsChannelMessage represents a message posted to a Teams channel.
type TeamsChannelMessage struct {
	Body        TeamsMessageBody         `json:"body"`
	Attachments []TeamsMessageAttachment `json:"attachments,omitempty"`
}

// TeamsMessageBody is the body content for a Teams message.
type TeamsMessageBody struct {
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
}

// TeamsMessageAttachment represents an Adaptive Card attachment.
type TeamsMessageAttachment struct {
	ID          string `json:"id"`
	ContentType string `json:"contentType"`
	ContentURL  *string `json:"contentUrl"`
	Content     string `json:"content"`
}

// PostTeamsMessage posts a message (optionally with Adaptive Card) to a Teams channel.
func (c *Client) PostTeamsMessage(ctx context.Context, teamID, channelID, htmlContent string, adaptiveCard json.RawMessage) error {
	msg := TeamsChannelMessage{
		Body: TeamsMessageBody{
			ContentType: "html",
			Content:     htmlContent,
		},
	}

	if len(adaptiveCard) > 0 {
		msg.Attachments = []TeamsMessageAttachment{
			{
				ID:          "adaptive-card-1",
				ContentType: "application/vnd.microsoft.card.adaptive",
				ContentURL:  nil,
				Content:     string(adaptiveCard),
			},
		}
		// When using adaptive card attachments, body references the attachment.
		msg.Body.Content = `<attachment id="adaptive-card-1"></attachment>`
	}

	path := fmt.Sprintf("/teams/%s/channels/%s/messages", teamID, channelID)
	resp, err := c.Post(ctx, path, msg)
	if err != nil {
		return fmt.Errorf("post teams message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("teams message returned %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// ──────────────────────────────────────────────
// Directory sync types
// ──────────────────────────────────────────────

// DirectoryUser represents a user from Graph API /users endpoint.
type DirectoryUser struct {
	ID             string  `json:"id"`
	DisplayName    string  `json:"displayName"`
	Mail           string  `json:"mail"`
	UserPrincipal  string  `json:"userPrincipalName"`
	JobTitle       *string `json:"jobTitle"`
	Department     *string `json:"department"`
	OfficeLocation *string `json:"officeLocation"`
	AccountEnabled bool    `json:"accountEnabled"`
	Manager        *struct {
		ID string `json:"id"`
	} `json:"manager,omitempty"`
}

// DirectoryDeltaResponse represents a Graph API delta query response.
type DirectoryDeltaResponse struct {
	Value     []DirectoryUser `json:"value"`
	NextLink  string          `json:"@odata.nextLink"`
	DeltaLink string          `json:"@odata.deltaLink"`
}

// GetUsersDelta performs a delta query for users from Graph API.
func (c *Client) GetUsersDelta(ctx context.Context, deltaToken string) (*DirectoryDeltaResponse, error) {
	var path string
	if deltaToken != "" {
		path = "/users/delta?$deltatoken=" + url.QueryEscape(deltaToken)
	} else {
		path = "/users/delta?$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,accountEnabled"
	}

	var allUsers []DirectoryUser
	var deltaLink string

	for path != "" {
		resp, err := c.Get(ctx, path)
		if err != nil {
			return nil, fmt.Errorf("get users delta: %w", err)
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("read delta response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("users delta returned %d: %s", resp.StatusCode, string(body))
		}

		var page DirectoryDeltaResponse
		if err := json.Unmarshal(body, &page); err != nil {
			return nil, fmt.Errorf("decode delta response: %w", err)
		}

		allUsers = append(allUsers, page.Value...)

		if page.NextLink != "" {
			// Extract path from full URL.
			parsed, err := url.Parse(page.NextLink)
			if err != nil {
				return nil, fmt.Errorf("parse next link: %w", err)
			}
			path = parsed.Path + "?" + parsed.RawQuery
			// Strip the base graph URL prefix.
			path = strings.TrimPrefix(path, "/v1.0")
		} else {
			path = ""
			deltaLink = page.DeltaLink
		}
	}

	// Extract delta token from the delta link.
	finalDeltaToken := ""
	if deltaLink != "" {
		parsed, err := url.Parse(deltaLink)
		if err == nil {
			finalDeltaToken = parsed.Query().Get("$deltatoken")
		}
	}

	return &DirectoryDeltaResponse{
		Value:     allUsers,
		DeltaLink: finalDeltaToken,
	}, nil
}
