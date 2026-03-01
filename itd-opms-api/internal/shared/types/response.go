package types

import (
	"encoding/json"
	"net/http"
)

// Response is the standard API response envelope.
type Response struct {
	Status  string        `json:"status"`
	Message string        `json:"message,omitempty"`
	Data    any           `json:"data,omitempty"`
	Meta    *Meta         `json:"meta,omitempty"`
	Errors  []ErrorDetail `json:"errors,omitempty"`
}

// Meta holds pagination and other response metadata.
type Meta struct {
	Page       int   `json:"page,omitempty"`
	Limit      int   `json:"limit,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"totalPages,omitempty"`
}

// ErrorDetail provides structured error information.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

// JSON writes a JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, resp Response) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

// OK sends a 200 success response.
func OK(w http.ResponseWriter, data any, meta *Meta) {
	JSON(w, http.StatusOK, Response{
		Status: "success",
		Data:   data,
		Meta:   meta,
	})
}

// Created sends a 201 created response.
func Created(w http.ResponseWriter, data any) {
	JSON(w, http.StatusCreated, Response{
		Status:  "success",
		Message: "Resource created",
		Data:    data,
	})
}

// NoContent sends a 204 no content response.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// Error sends an error response with the given status code.
func Error(w http.ResponseWriter, status int, errors ...ErrorDetail) {
	JSON(w, status, Response{
		Status: "error",
		Errors: errors,
	})
}

// ErrorMessage sends an error response with a simple message.
func ErrorMessage(w http.ResponseWriter, status int, code, message string) {
	Error(w, status, ErrorDetail{Code: code, Message: message})
}
