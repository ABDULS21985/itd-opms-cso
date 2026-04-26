// Package connectors provides adapters for importing CI data from external
// systems into the ITD-OPMS CMDB discovery pipeline.
//
// oracle_erp.go defines the pluggable Oracle ERP integration for financial
// data: asset costs, procurement, and budgets.

package connectors

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// AssetFinancials contains financial data for a single asset.
type AssetFinancials struct {
	AssetTag         string    `json:"assetTag"`
	PurchaseDate     time.Time `json:"purchaseDate"`
	PurchasePrice    float64   `json:"purchasePrice"`
	Currency         string    `json:"currency"`
	DepreciationRate float64   `json:"depreciationRate"`
	CurrentBookValue float64   `json:"currentBookValue"`
	CostCenter       string    `json:"costCenter"`
	PONumber         string    `json:"poNumber"`
}

// AssetCostUpdate represents a cost/depreciation change from ERP sync.
type AssetCostUpdate struct {
	AssetTag         string  `json:"assetTag"`
	ERPAssetID       string  `json:"erpAssetId"`
	PurchasePrice    float64 `json:"purchasePrice"`
	CurrentBookValue float64 `json:"currentBookValue"`
	DepreciationRate float64 `json:"depreciationRate"`
	Currency         string  `json:"currency"`
	CostCenter       string  `json:"costCenter"`
	PONumber         string  `json:"poNumber"`
}

// PurchaseOrder represents an ERP purchase order.
type PurchaseOrder struct {
	PONumber     string       `json:"poNumber"`
	VendorName   string       `json:"vendorName"`
	OrderDate    time.Time    `json:"orderDate"`
	TotalAmount  float64      `json:"totalAmount"`
	Currency     string       `json:"currency"`
	Status       string       `json:"status"`
	DeliveryDate *time.Time   `json:"deliveryDate"`
	LineItems    []POLineItem `json:"lineItems"`
}

// POLineItem is a single line on a purchase order.
type POLineItem struct {
	ItemNumber  int     `json:"itemNumber"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	AssetTag    string  `json:"assetTag"`
}

// PendingDelivery represents an item awaiting delivery from procurement.
type PendingDelivery struct {
	PONumber     string    `json:"poNumber"`
	Description  string    `json:"description"`
	ExpectedDate time.Time `json:"expectedDate"`
	Quantity     int       `json:"quantity"`
	VendorName   string    `json:"vendorName"`
}

// BudgetAllocation represents a cost-center budget from the ERP.
type BudgetAllocation struct {
	CostCenter string  `json:"costCenter"`
	FiscalYear int     `json:"fiscalYear"`
	Allocated  float64 `json:"allocated"`
	Spent      float64 `json:"spent"`
	Committed  float64 `json:"committed"`
	Available  float64 `json:"available"`
	Currency   string  `json:"currency"`
}

// ──────────────────────────────────────────────
// Interface
// ──────────────────────────────────────────────

// ERPConnector defines the pluggable interface for ERP financial integration.
// When CBN provides Oracle ERP API details, implement this interface with
// real HTTP calls — only the connector implementation needs to change.
type ERPConnector interface {
	// Asset financial data
	GetAssetFinancials(assetTag string) (*AssetFinancials, error)
	SyncAssetCosts(since time.Time) ([]AssetCostUpdate, error)

	// Procurement
	GetPurchaseOrder(poNumber string) (*PurchaseOrder, error)
	GetPendingDeliveries() ([]PendingDelivery, error)

	// Budget
	GetBudgetAllocation(costCenter string, fiscalYear int) (*BudgetAllocation, error)
}

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

// ERPConfig holds Oracle ERP connection configuration.
// Populated from environment variables.
type ERPConfig struct {
	Enabled      bool          `json:"enabled"`
	Endpoint     string        `json:"endpoint"`
	APIKey       string        `json:"-"` // never serialise
	APIKeyHeader string        `json:"-"`
	Username     string        `json:"-"`
	Password     string        `json:"-"`
	AuthType     string        `json:"authType"` // "bearer" | "api_key" | "basic"
	Timeout      time.Duration `json:"timeout"`

	AssetFinancialsPath   string `json:"assetFinancialsPath"`
	AssetCostsPath        string `json:"assetCostsPath"`
	PurchaseOrderPath     string `json:"purchaseOrderPath"`
	PendingDeliveriesPath string `json:"pendingDeliveriesPath"`
	BudgetAllocationPath  string `json:"budgetAllocationPath"`
}

// LoadERPConfig reads ERP settings from environment variables.
func LoadERPConfig() ERPConfig {
	timeout := time.Duration(envInt("ERP_TIMEOUT_SECONDS", 30)) * time.Second
	return ERPConfig{
		Enabled:      os.Getenv("ERP_ENABLED") == "true",
		Endpoint:     strings.TrimRight(os.Getenv("ERP_ENDPOINT"), "/"),
		APIKey:       os.Getenv("ERP_API_KEY"),
		APIKeyHeader: firstNonEmpty(os.Getenv("ERP_API_KEY_HEADER"), "X-API-Key"),
		Username:     os.Getenv("ERP_USERNAME"),
		Password:     os.Getenv("ERP_PASSWORD"),
		AuthType:     firstNonEmpty(os.Getenv("ERP_AUTH_TYPE"), "bearer"),
		Timeout:      timeout,

		AssetFinancialsPath:   firstNonEmpty(os.Getenv("ERP_ASSET_FINANCIALS_PATH"), "/assets/{assetTag}/financials"),
		AssetCostsPath:        firstNonEmpty(os.Getenv("ERP_ASSET_COSTS_PATH"), "/assets/costs?since={since}"),
		PurchaseOrderPath:     firstNonEmpty(os.Getenv("ERP_PURCHASE_ORDER_PATH"), "/purchase-orders/{poNumber}"),
		PendingDeliveriesPath: firstNonEmpty(os.Getenv("ERP_PENDING_DELIVERIES_PATH"), "/purchase-orders/pending-deliveries"),
		BudgetAllocationPath:  firstNonEmpty(os.Getenv("ERP_BUDGET_ALLOCATION_PATH"), "/budgets/{costCenter}/{fiscalYear}"),
	}
}

// ──────────────────────────────────────────────
// Oracle REST implementation
// ──────────────────────────────────────────────

// OracleERPConnector reads ERP data through configurable Oracle REST endpoints.
// The path templates support placeholders such as {assetTag}, {since},
// {poNumber}, {costCenter}, and {fiscalYear}. This keeps the connector usable
// with Oracle Fusion REST APIs or an integration gateway without hard-coding
// CBN-specific endpoint shapes in application code.
type OracleERPConnector struct {
	config     ERPConfig
	httpClient *http.Client
}

// NewOracleERPConnector creates a REST-backed Oracle ERP connector.
func NewOracleERPConnector(cfg ERPConfig) *OracleERPConnector {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &OracleERPConnector{
		config:     cfg,
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (c *OracleERPConnector) GetAssetFinancials(assetTag string) (*AssetFinancials, error) {
	if strings.TrimSpace(assetTag) == "" {
		return nil, fmt.Errorf("asset tag is required")
	}

	payload, err := c.getObject(c.config.AssetFinancialsPath, map[string]string{
		"assetTag": assetTag,
	})
	if err != nil {
		return nil, err
	}

	purchaseDate := getTime(payload, "purchaseDate", "purchase_date", "datePlacedInService", "DatePlacedInService")
	return &AssetFinancials{
		AssetTag:         firstNonEmpty(getString(payload, "assetTag", "asset_tag", "assetNumber", "AssetNumber"), assetTag),
		PurchaseDate:     purchaseDate,
		PurchasePrice:    getFloat(payload, "purchasePrice", "purchase_price", "cost", "Cost", "originalCost", "OriginalCost"),
		Currency:         firstNonEmpty(getString(payload, "currency", "Currency", "currencyCode", "CurrencyCode"), "NGN"),
		DepreciationRate: getFloat(payload, "depreciationRate", "depreciation_rate", "DepreciationRate"),
		CurrentBookValue: getFloat(payload, "currentBookValue", "current_book_value", "netBookValue", "NetBookValue"),
		CostCenter:       getString(payload, "costCenter", "cost_center", "CostCenter"),
		PONumber:         getString(payload, "poNumber", "po_number", "purchaseOrderNumber", "PurchaseOrderNumber"),
	}, nil
}

func (c *OracleERPConnector) SyncAssetCosts(since time.Time) ([]AssetCostUpdate, error) {
	items, err := c.getList(c.config.AssetCostsPath, map[string]string{
		"since": since.UTC().Format(time.RFC3339),
	})
	if err != nil {
		return nil, err
	}

	updates := make([]AssetCostUpdate, 0, len(items))
	for _, item := range items {
		assetTag := getString(item, "assetTag", "asset_tag", "assetNumber", "AssetNumber")
		if strings.TrimSpace(assetTag) == "" {
			continue
		}
		updates = append(updates, AssetCostUpdate{
			AssetTag:         assetTag,
			ERPAssetID:       getString(item, "erpAssetId", "erp_asset_id", "assetId", "AssetId"),
			PurchasePrice:    getFloat(item, "purchasePrice", "purchase_price", "cost", "Cost", "originalCost", "OriginalCost"),
			CurrentBookValue: getFloat(item, "currentBookValue", "current_book_value", "netBookValue", "NetBookValue"),
			DepreciationRate: getFloat(item, "depreciationRate", "depreciation_rate", "DepreciationRate"),
			Currency:         firstNonEmpty(getString(item, "currency", "Currency", "currencyCode", "CurrencyCode"), "NGN"),
			CostCenter:       getString(item, "costCenter", "cost_center", "CostCenter"),
			PONumber:         getString(item, "poNumber", "po_number", "purchaseOrderNumber", "PurchaseOrderNumber"),
		})
	}
	return updates, nil
}

func (c *OracleERPConnector) GetPurchaseOrder(poNumber string) (*PurchaseOrder, error) {
	if strings.TrimSpace(poNumber) == "" {
		return nil, fmt.Errorf("purchase order number is required")
	}

	payload, err := c.getObject(c.config.PurchaseOrderPath, map[string]string{
		"poNumber": poNumber,
	})
	if err != nil {
		return nil, err
	}

	orderDate := getTime(payload, "orderDate", "order_date", "CreationDate", "creationDate")
	deliveryDate := optionalTime(payload, "deliveryDate", "delivery_date", "PromisedDate", "promisedDate")
	lineItems := parsePOLineItems(payload)

	return &PurchaseOrder{
		PONumber:     firstNonEmpty(getString(payload, "poNumber", "po_number", "orderNumber", "OrderNumber"), poNumber),
		VendorName:   getString(payload, "vendorName", "vendor_name", "Supplier", "supplier"),
		OrderDate:    orderDate,
		TotalAmount:  getFloat(payload, "totalAmount", "total_amount", "Amount", "amount"),
		Currency:     firstNonEmpty(getString(payload, "currency", "Currency", "currencyCode", "CurrencyCode"), "NGN"),
		Status:       getString(payload, "status", "Status"),
		DeliveryDate: deliveryDate,
		LineItems:    lineItems,
	}, nil
}

func (c *OracleERPConnector) GetPendingDeliveries() ([]PendingDelivery, error) {
	items, err := c.getList(c.config.PendingDeliveriesPath, nil)
	if err != nil {
		return nil, err
	}

	deliveries := make([]PendingDelivery, 0, len(items))
	for _, item := range items {
		expectedDate := getTime(item, "expectedDate", "expected_date", "PromisedDate", "promisedDate")
		deliveries = append(deliveries, PendingDelivery{
			PONumber:     getString(item, "poNumber", "po_number", "orderNumber", "OrderNumber"),
			Description:  getString(item, "description", "Description", "itemDescription", "ItemDescription"),
			ExpectedDate: expectedDate,
			Quantity:     int(getFloat(item, "quantity", "Quantity")),
			VendorName:   getString(item, "vendorName", "vendor_name", "Supplier", "supplier"),
		})
	}
	return deliveries, nil
}

func (c *OracleERPConnector) GetBudgetAllocation(costCenter string, fiscalYear int) (*BudgetAllocation, error) {
	if strings.TrimSpace(costCenter) == "" {
		return nil, fmt.Errorf("cost center is required")
	}
	if fiscalYear <= 0 {
		return nil, fmt.Errorf("fiscal year is required")
	}

	payload, err := c.getObject(c.config.BudgetAllocationPath, map[string]string{
		"costCenter": costCenter,
		"fiscalYear": strconv.Itoa(fiscalYear),
	})
	if err != nil {
		return nil, err
	}

	return &BudgetAllocation{
		CostCenter: costCenter,
		FiscalYear: fiscalYear,
		Allocated:  getFloat(payload, "allocated", "Allocated", "budgetAmount", "BudgetAmount"),
		Spent:      getFloat(payload, "spent", "Spent", "actualAmount", "ActualAmount"),
		Committed:  getFloat(payload, "committed", "Committed", "encumbranceAmount", "EncumbranceAmount"),
		Available:  getFloat(payload, "available", "Available", "fundsAvailable", "FundsAvailable"),
		Currency:   firstNonEmpty(getString(payload, "currency", "Currency", "currencyCode", "CurrencyCode"), "NGN"),
	}, nil
}

func (c *OracleERPConnector) getObject(pathTemplate string, vars map[string]string) (map[string]any, error) {
	items, err := c.getList(pathTemplate, vars)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("ERP response did not contain any records")
	}
	return items[0], nil
}

func (c *OracleERPConnector) getList(pathTemplate string, vars map[string]string) ([]map[string]any, error) {
	if strings.TrimSpace(c.config.Endpoint) == "" {
		return nil, fmt.Errorf("ERP endpoint is not configured")
	}

	endpoint := renderERPPath(pathTemplate, vars)
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		endpoint = strings.TrimRight(c.config.Endpoint, "/") + "/" + strings.TrimLeft(endpoint, "/")
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create ERP request: %w", err)
	}
	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call ERP endpoint: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read ERP response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("ERP endpoint returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload any
	decoder := json.NewDecoder(strings.NewReader(string(body)))
	decoder.UseNumber()
	if err := decoder.Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode ERP response: %w", err)
	}
	return extractERPRecords(payload), nil
}

func (c *OracleERPConnector) applyAuth(req *http.Request) {
	switch strings.ToLower(strings.TrimSpace(c.config.AuthType)) {
	case "basic":
		if c.config.Username != "" || c.config.Password != "" {
			req.SetBasicAuth(c.config.Username, c.config.Password)
		}
	case "api_key":
		if c.config.APIKey != "" {
			req.Header.Set(firstNonEmpty(c.config.APIKeyHeader, "X-API-Key"), c.config.APIKey)
		}
	default:
		if c.config.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
		}
	}
	req.Header.Set("Accept", "application/json")
}

func renderERPPath(pathTemplate string, vars map[string]string) string {
	rendered := pathTemplate
	for key, value := range vars {
		escaped := url.PathEscape(value)
		if strings.Contains(rendered, "?") {
			escaped = url.QueryEscape(value)
		}
		rendered = strings.ReplaceAll(rendered, "{"+key+"}", escaped)
	}
	return rendered
}

func extractERPRecords(payload any) []map[string]any {
	switch value := payload.(type) {
	case []any:
		return mapsFromAnySlice(value)
	case map[string]any:
		for _, key := range []string{"items", "value", "data", "records", "results"} {
			if raw, ok := lookupAny(value, key); ok {
				if list, ok := raw.([]any); ok {
					return mapsFromAnySlice(list)
				}
				if nested, ok := raw.(map[string]any); ok {
					return []map[string]any{nested}
				}
			}
		}
		return []map[string]any{value}
	default:
		return nil
	}
}

func mapsFromAnySlice(items []any) []map[string]any {
	records := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if record, ok := item.(map[string]any); ok {
			records = append(records, record)
		}
	}
	return records
}

func lookupAny(payload map[string]any, key string) (any, bool) {
	if value, ok := payload[key]; ok {
		return value, true
	}
	for existingKey, value := range payload {
		if strings.EqualFold(existingKey, key) {
			return value, true
		}
	}
	return nil, false
}

func getString(payload map[string]any, keys ...string) string {
	for _, key := range keys {
		value, ok := lookupAny(payload, key)
		if !ok || value == nil {
			continue
		}
		switch v := value.(type) {
		case string:
			return strings.TrimSpace(v)
		case json.Number:
			return v.String()
		default:
			return strings.TrimSpace(fmt.Sprintf("%v", v))
		}
	}
	return ""
}

func getFloat(payload map[string]any, keys ...string) float64 {
	for _, key := range keys {
		value, ok := lookupAny(payload, key)
		if !ok || value == nil {
			continue
		}
		switch v := value.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		case int64:
			return float64(v)
		case json.Number:
			f, _ := v.Float64()
			return f
		case string:
			f, _ := strconv.ParseFloat(strings.ReplaceAll(v, ",", ""), 64)
			return f
		}
	}
	return 0
}

func getTime(payload map[string]any, keys ...string) time.Time {
	if parsed := optionalTime(payload, keys...); parsed != nil {
		return *parsed
	}
	return time.Time{}
}

func optionalTime(payload map[string]any, keys ...string) *time.Time {
	raw := getString(payload, keys...)
	if raw == "" {
		return nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02", "2006-01-02 15:04:05", "02-Jan-2006"} {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return &parsed
		}
	}
	return nil
}

func parsePOLineItems(payload map[string]any) []POLineItem {
	raw, ok := lookupAny(payload, "lineItems")
	if !ok {
		raw, ok = lookupAny(payload, "lines")
	}
	if !ok {
		raw, ok = lookupAny(payload, "items")
	}
	if !ok {
		return []POLineItem{}
	}
	items, ok := raw.([]any)
	if !ok {
		return []POLineItem{}
	}
	lineItems := make([]POLineItem, 0, len(items))
	for i, rawItem := range items {
		item, ok := rawItem.(map[string]any)
		if !ok {
			continue
		}
		itemNumber := int(getFloat(item, "itemNumber", "lineNumber", "LineNumber"))
		if itemNumber == 0 {
			itemNumber = i + 1
		}
		lineItems = append(lineItems, POLineItem{
			ItemNumber:  itemNumber,
			Description: getString(item, "description", "Description", "itemDescription", "ItemDescription"),
			Quantity:    int(getFloat(item, "quantity", "Quantity")),
			UnitPrice:   getFloat(item, "unitPrice", "unit_price", "UnitPrice"),
			AssetTag:    getString(item, "assetTag", "asset_tag", "assetNumber", "AssetNumber"),
		})
	}
	return lineItems
}

// StubERPConnector returns hard-coded sample data.
// It is used only when ERP_ENABLED=false, so local development remains usable
// without enterprise ERP credentials.
type StubERPConnector struct {
	Config ERPConfig
}

// NewStubERPConnector creates a stub connector for development/testing.
func NewStubERPConnector(cfg ERPConfig) *StubERPConnector {
	return &StubERPConnector{Config: cfg}
}

// GetAssetFinancials returns sample financial data for the given asset tag.
// STUB: returns synthetic data for any asset tag.
func (s *StubERPConnector) GetAssetFinancials(assetTag string) (*AssetFinancials, error) {
	purchaseDate := time.Now().AddDate(-2, 0, 0)
	purchasePrice := 450000.00
	depRate := 20.0
	yearsOwned := time.Since(purchaseDate).Hours() / (24 * 365.25)
	bookValue := purchasePrice * math.Pow(1-depRate/100, yearsOwned)

	return &AssetFinancials{
		AssetTag:         assetTag,
		PurchaseDate:     purchaseDate,
		PurchasePrice:    purchasePrice,
		Currency:         "NGN",
		DepreciationRate: depRate,
		CurrentBookValue: math.Round(bookValue*100) / 100,
		CostCenter:       "IT-OPS-001",
		PONumber:         fmt.Sprintf("PO-2024-%s", assetTag),
	}, nil
}

// SyncAssetCosts returns sample cost updates since the given timestamp.
// STUB: returns a fixed set of sample records.
func (s *StubERPConnector) SyncAssetCosts(since time.Time) ([]AssetCostUpdate, error) {
	return []AssetCostUpdate{
		{
			AssetTag:         "AST-001",
			ERPAssetID:       "ORA-FA-10001",
			PurchasePrice:    750000.00,
			CurrentBookValue: 525000.00,
			DepreciationRate: 15.0,
			Currency:         "NGN",
			CostCenter:       "IT-INFRA-001",
			PONumber:         "PO-2024-001",
		},
		{
			AssetTag:         "AST-002",
			ERPAssetID:       "ORA-FA-10002",
			PurchasePrice:    320000.00,
			CurrentBookValue: 204800.00,
			DepreciationRate: 20.0,
			Currency:         "NGN",
			CostCenter:       "IT-OPS-002",
			PONumber:         "PO-2024-002",
		},
	}, nil
}

// GetPurchaseOrder returns a sample purchase order.
// STUB: returns synthetic PO data.
func (s *StubERPConnector) GetPurchaseOrder(poNumber string) (*PurchaseOrder, error) {
	orderDate := time.Now().AddDate(0, -3, 0)
	deliveryDate := time.Now().AddDate(0, -2, 0)
	return &PurchaseOrder{
		PONumber:     poNumber,
		VendorName:   "Dell Technologies Nigeria",
		OrderDate:    orderDate,
		TotalAmount:  2150000.00,
		Currency:     "NGN",
		Status:       "delivered",
		DeliveryDate: &deliveryDate,
		LineItems: []POLineItem{
			{ItemNumber: 1, Description: "Dell PowerEdge R750 Server", Quantity: 2, UnitPrice: 850000.00, AssetTag: "AST-001"},
			{ItemNumber: 2, Description: "Dell 24\" Monitor P2422H", Quantity: 5, UnitPrice: 90000.00, AssetTag: "AST-003"},
		},
	}, nil
}

// GetPendingDeliveries returns sample pending deliveries.
// STUB: returns a fixed set of pending items.
func (s *StubERPConnector) GetPendingDeliveries() ([]PendingDelivery, error) {
	return []PendingDelivery{
		{
			PONumber:     "PO-2025-010",
			Description:  "HP ProBook 450 G10 Laptops (batch of 20)",
			ExpectedDate: time.Now().AddDate(0, 0, 14),
			Quantity:     20,
			VendorName:   "HP Enterprise Nigeria",
		},
		{
			PONumber:     "PO-2025-012",
			Description:  "Cisco Catalyst 9300 Switches",
			ExpectedDate: time.Now().AddDate(0, 1, 0),
			Quantity:     4,
			VendorName:   "Cisco Systems",
		},
	}, nil
}

// GetBudgetAllocation returns a sample budget allocation.
// STUB: returns synthetic budget data.
func (s *StubERPConnector) GetBudgetAllocation(costCenter string, fiscalYear int) (*BudgetAllocation, error) {
	return &BudgetAllocation{
		CostCenter: costCenter,
		FiscalYear: fiscalYear,
		Allocated:  50000000.00,
		Spent:      32500000.00,
		Committed:  8750000.00,
		Available:  8750000.00,
		Currency:   "NGN",
	}, nil
}

// NewERPConnector returns the appropriate connector based on configuration.
// When ERP_ENABLED is false, returns the stub connector.
func NewERPConnector(cfg ERPConfig) ERPConnector {
	if cfg.Enabled {
		return NewOracleERPConnector(cfg)
	}
	return NewStubERPConnector(cfg)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}
