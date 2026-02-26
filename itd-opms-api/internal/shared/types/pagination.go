package types

import (
	"math"
	"net/http"
	"strconv"
)

// PaginationParams holds pagination query parameters.
type PaginationParams struct {
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
	Sort  string `json:"sort"`
	Order string `json:"order"` // "asc" or "desc"
}

// DefaultPagination returns default pagination params.
func DefaultPagination() PaginationParams {
	return PaginationParams{
		Page:  1,
		Limit: 20,
		Sort:  "created_at",
		Order: "desc",
	}
}

// ParsePagination extracts pagination params from the request query string.
func ParsePagination(r *http.Request) PaginationParams {
	p := DefaultPagination()

	if page := r.URL.Query().Get("page"); page != "" {
		if v, err := strconv.Atoi(page); err == nil && v > 0 {
			p.Page = v
		}
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if v, err := strconv.Atoi(limit); err == nil && v > 0 && v <= 100 {
			p.Limit = v
		}
	}

	if sort := r.URL.Query().Get("sort"); sort != "" {
		p.Sort = sort
	}

	if order := r.URL.Query().Get("order"); order == "asc" || order == "desc" {
		p.Order = order
	}

	return p
}

// Offset returns the SQL OFFSET value.
func (p PaginationParams) Offset() int {
	return (p.Page - 1) * p.Limit
}

// NewMeta creates pagination metadata from total count.
func NewMeta(total int64, params PaginationParams) *Meta {
	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))
	return &Meta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: totalPages,
	}
}
