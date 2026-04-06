package connectors

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/itd-cbn/itd-opms-api/internal/platform/msgraph"
)

type graphGetter interface {
	Get(ctx context.Context, path string) (*http.Response, error)
}

// ADDiscoveryConnector discovers Entra-registered devices through Microsoft Graph.
type ADDiscoveryConnector struct {
	client graphGetter
}

// NewADDiscoveryConnector creates a Graph-backed AD discovery connector.
func NewADDiscoveryConnector(client *msgraph.Client) *ADDiscoveryConnector {
	return &ADDiscoveryConnector{client: client}
}

type adDevicesPage struct {
	Value    []json.RawMessage `json:"value"`
	NextLink string            `json:"@odata.nextLink"`
}

type adGraphDevice struct {
	DisplayName            string `json:"displayName"`
	OperatingSystem        string `json:"operatingSystem"`
	OperatingSystemVersion string `json:"operatingSystemVersion"`
	Manufacturer           string `json:"manufacturer"`
	Model                  string `json:"model"`
}

// FetchComputers loads computer/device objects from Microsoft Graph.
func (c *ADDiscoveryConnector) FetchComputers(ctx context.Context, cfg ADConfig) ([]DiscoveredDevice, error) {
	if c == nil || c.client == nil {
		return nil, fmt.Errorf("microsoft graph client is not configured")
	}

	path := "/devices?$filter=operatingSystem ne null&$select=displayName,operatingSystem,operatingSystemVersion,manufacturer,model,deviceId,approximateLastSignInDateTime"
	var devices []DiscoveredDevice

	for path != "" {
		resp, err := c.client.Get(ctx, path)
		if err != nil {
			return nil, fmt.Errorf("fetch devices from microsoft graph: %w", err)
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("read microsoft graph response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("microsoft graph returned %d: %s", resp.StatusCode, string(body))
		}

		var page adDevicesPage
		if err := json.Unmarshal(body, &page); err != nil {
			return nil, fmt.Errorf("decode microsoft graph response: %w", err)
		}

		for _, raw := range page.Value {
			var item adGraphDevice
			if err := json.Unmarshal(raw, &item); err != nil {
				return nil, fmt.Errorf("decode microsoft graph device: %w", err)
			}

			if strings.TrimSpace(item.DisplayName) == "" {
				continue
			}

			attrs := map[string]any{}
			if err := json.Unmarshal(raw, &attrs); err != nil {
				attrs = map[string]any{}
			}
			if cfg.TenantID != "" {
				attrs["tenantId"] = cfg.TenantID
			}

			devices = append(devices, DiscoveredDevice{
				Hostname:     stringPtr(item.DisplayName),
				OSName:       stringPtr(item.OperatingSystem),
				OSVersion:    stringPtr(item.OperatingSystemVersion),
				Manufacturer: stringPtr(item.Manufacturer),
				Model:        stringPtr(item.Model),
				DeviceType:   stringPtr(inferADDeviceType(item.OperatingSystem)),
				Attributes:   mustRawJSON(attrs),
				Source:       "ad_import",
			})
		}

		path, err = graphNextPath(page.NextLink)
		if err != nil {
			return nil, err
		}
	}

	return devices, nil
}

func graphNextPath(nextLink string) (string, error) {
	if nextLink == "" {
		return "", nil
	}

	parsed, err := url.Parse(nextLink)
	if err != nil {
		return "", fmt.Errorf("parse graph next link: %w", err)
	}

	path := parsed.Path
	if parsed.RawQuery != "" {
		path += "?" + parsed.RawQuery
	}
	path = strings.TrimPrefix(path, "/v1.0")
	if path == "" {
		return "", fmt.Errorf("graph next link %q did not contain a v1.0 path", nextLink)
	}
	return path, nil
}

func inferADDeviceType(osName string) string {
	osName = strings.ToLower(strings.TrimSpace(osName))
	switch {
	case strings.Contains(osName, "windows server"):
		return "server"
	case strings.Contains(osName, "windows"), strings.Contains(osName, "mac"), strings.Contains(osName, "linux"):
		return "workstation"
	case strings.Contains(osName, "ios"), strings.Contains(osName, "android"):
		return "mobile"
	default:
		return "endpoint"
	}
}
