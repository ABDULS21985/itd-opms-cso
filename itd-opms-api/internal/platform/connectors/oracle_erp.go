// Package connectors provides adapters for importing CI data from external
// systems into the ITD-OPMS CMDB discovery pipeline.
//
// oracle_erp.go defines the pluggable Oracle ERP integration for financial
// data — asset costs, procurement, and budgets. The current implementation
// is a stub; swap in the real connector once CBN provides ERP API details.

package connectors

import (
	"fmt"
	"math"
	"os"
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
	PONumber      string    `json:"poNumber"`
	VendorName    string    `json:"vendorName"`
	OrderDate     time.Time `json:"orderDate"`
	TotalAmount   float64   `json:"totalAmount"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
	DeliveryDate  *time.Time `json:"deliveryDate"`
	LineItems     []POLineItem `json:"lineItems"`
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
	CostCenter  string  `json:"costCenter"`
	FiscalYear  int     `json:"fiscalYear"`
	Allocated   float64 `json:"allocated"`
	Spent       float64 `json:"spent"`
	Committed   float64 `json:"committed"`
	Available   float64 `json:"available"`
	Currency    string  `json:"currency"`
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
	Enabled  bool   `json:"enabled"`
	Endpoint string `json:"endpoint"`
	APIKey   string `json:"-"` // never serialise
	AuthType string `json:"authType"` // "api_key" | "oauth2" | "basic"
}

// LoadERPConfig reads ERP settings from environment variables.
func LoadERPConfig() ERPConfig {
	return ERPConfig{
		Enabled:  os.Getenv("ERP_ENABLED") == "true",
		Endpoint: os.Getenv("ERP_ENDPOINT"),
		APIKey:   os.Getenv("ERP_API_KEY"),
		AuthType: os.Getenv("ERP_AUTH_TYPE"),
	}
}

// ──────────────────────────────────────────────
// Stub implementation
// ──────────────────────────────────────────────

// StubERPConnector returns hard-coded sample data.
// Clearly marked as STUB — replace with real Oracle ERP calls.
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
	// TODO: when CBN provides Oracle ERP API details, add:
	//   if cfg.Enabled { return NewOracleERPConnector(cfg) }
	return NewStubERPConnector(cfg)
}
