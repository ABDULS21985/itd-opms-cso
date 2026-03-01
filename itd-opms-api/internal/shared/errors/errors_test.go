package errors_test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
)

// ──────────────────────────────────────────────
// Error constructors — status, code, message
// ──────────────────────────────────────────────

func TestNotFoundError(t *testing.T) {
	err := apperrors.NotFound("user", "abc-123")

	if apperrors.HTTPStatus(err) != http.StatusNotFound {
		t.Errorf("expected 404, got %d", apperrors.HTTPStatus(err))
	}

	if apperrors.Code(err) != "NOT_FOUND" {
		t.Errorf("expected NOT_FOUND, got %s", apperrors.Code(err))
	}

	expected := "user with id abc-123 not found"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

func TestBadRequestError(t *testing.T) {
	err := apperrors.BadRequest("invalid input")

	if apperrors.HTTPStatus(err) != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", apperrors.HTTPStatus(err))
	}

	if apperrors.Code(err) != "BAD_REQUEST" {
		t.Errorf("expected BAD_REQUEST, got %s", apperrors.Code(err))
	}

	if err.Error() != "invalid input" {
		t.Errorf("expected 'invalid input', got %q", err.Error())
	}
}

func TestUnauthorizedError(t *testing.T) {
	err := apperrors.Unauthorized("not authenticated")

	if apperrors.HTTPStatus(err) != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", apperrors.HTTPStatus(err))
	}

	if apperrors.Code(err) != "UNAUTHORIZED" {
		t.Errorf("expected UNAUTHORIZED, got %s", apperrors.Code(err))
	}
}

func TestForbiddenError(t *testing.T) {
	err := apperrors.Forbidden("access denied")

	if apperrors.HTTPStatus(err) != http.StatusForbidden {
		t.Errorf("expected 403, got %d", apperrors.HTTPStatus(err))
	}

	if apperrors.Code(err) != "FORBIDDEN" {
		t.Errorf("expected FORBIDDEN, got %s", apperrors.Code(err))
	}
}

func TestConflictError(t *testing.T) {
	err := apperrors.Conflict("duplicate entry")

	if apperrors.HTTPStatus(err) != http.StatusConflict {
		t.Errorf("expected 409, got %d", apperrors.HTTPStatus(err))
	}

	if apperrors.Code(err) != "CONFLICT" {
		t.Errorf("expected CONFLICT, got %s", apperrors.Code(err))
	}
}

func TestInternalError(t *testing.T) {
	cause := fmt.Errorf("connection refused")
	err := apperrors.Internal("db failure", cause)

	if apperrors.HTTPStatus(err) != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", apperrors.HTTPStatus(err))
	}

	if apperrors.Code(err) != "INTERNAL_ERROR" {
		t.Errorf("expected INTERNAL_ERROR, got %s", apperrors.Code(err))
	}

	expected := "db failure: connection refused"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

func TestInternalErrorNilCause(t *testing.T) {
	err := apperrors.Internal("something broke", nil)

	if err.Error() != "something broke" {
		t.Errorf("expected 'something broke', got %q", err.Error())
	}
}

func TestValidationError(t *testing.T) {
	err := apperrors.Validation("email", "must be a valid email")

	if apperrors.HTTPStatus(err) != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", apperrors.HTTPStatus(err))
	}

	if apperrors.Code(err) != "VALIDATION_ERROR" {
		t.Errorf("expected VALIDATION_ERROR, got %s", apperrors.Code(err))
	}

	expected := "email: must be a valid email"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

// ──────────────────────────────────────────────
// HTTPStatus / Code fallbacks for plain errors
// ──────────────────────────────────────────────

func TestHTTPStatusFallbackForPlainError(t *testing.T) {
	plain := fmt.Errorf("some generic error")

	if apperrors.HTTPStatus(plain) != http.StatusInternalServerError {
		t.Errorf("expected 500 for plain error, got %d", apperrors.HTTPStatus(plain))
	}
}

func TestCodeFallbackForPlainError(t *testing.T) {
	plain := fmt.Errorf("some generic error")

	if apperrors.Code(plain) != "INTERNAL_ERROR" {
		t.Errorf("expected INTERNAL_ERROR for plain error, got %s", apperrors.Code(plain))
	}
}

// ──────────────────────────────────────────────
// Unwrap and errors.Is / errors.As chains
// ──────────────────────────────────────────────

func TestAppErrorUnwrap(t *testing.T) {
	cause := fmt.Errorf("original")
	err := apperrors.Internal("wrapper", cause)

	unwrapped := err.Unwrap()
	if unwrapped == nil {
		t.Fatal("expected non-nil unwrapped error")
	}
	if unwrapped.Error() != "original" {
		t.Errorf("expected 'original', got %q", unwrapped.Error())
	}
}

func TestErrorsAs_AppError(t *testing.T) {
	err := apperrors.NotFound("project", "xyz")
	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) {
		t.Fatal("expected errors.As to succeed for *AppError")
	}
	if appErr.Code != "NOT_FOUND" {
		t.Errorf("expected code NOT_FOUND, got %s", appErr.Code)
	}
	if appErr.Status != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", appErr.Status)
	}
}

func TestErrorsAs_WrappedAppError(t *testing.T) {
	original := apperrors.BadRequest("bad input")
	wrapped := fmt.Errorf("service layer: %w", original)

	var appErr *apperrors.AppError
	if !errors.As(wrapped, &appErr) {
		t.Fatal("expected errors.As to find *AppError through wrapping")
	}
	if appErr.Code != "BAD_REQUEST" {
		t.Errorf("expected BAD_REQUEST, got %s", appErr.Code)
	}
}

func TestErrorsIs_WrappedCause(t *testing.T) {
	sentinel := fmt.Errorf("sentinel error")
	appErr := apperrors.Internal("wrapped", sentinel)

	if !errors.Is(appErr, sentinel) {
		t.Error("expected errors.Is to find sentinel error through AppError.Unwrap()")
	}
}

func TestErrorsIs_NilCause(t *testing.T) {
	appErr := apperrors.Internal("no cause", nil)

	if errors.Is(appErr, fmt.Errorf("something")) {
		t.Error("expected errors.Is to return false for unrelated error")
	}
}

func TestHTTPStatus_WrappedAppError(t *testing.T) {
	original := apperrors.Forbidden("no access")
	wrapped := fmt.Errorf("handler: %w", original)

	status := apperrors.HTTPStatus(wrapped)
	if status != http.StatusForbidden {
		t.Errorf("expected 403 through wrapped error, got %d", status)
	}
}

func TestCode_WrappedAppError(t *testing.T) {
	original := apperrors.Conflict("already exists")
	wrapped := fmt.Errorf("handler: %w", original)

	code := apperrors.Code(wrapped)
	if code != "CONFLICT" {
		t.Errorf("expected CONFLICT through wrapped error, got %s", code)
	}
}

// ──────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────

func TestNotFound_EmptyEntity(t *testing.T) {
	err := apperrors.NotFound("", "")
	expected := " with id  not found"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

func TestValidation_EmptyField(t *testing.T) {
	err := apperrors.Validation("", "something wrong")
	expected := ": something wrong"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

func TestAllConstructors_StatusMapping(t *testing.T) {
	tests := []struct {
		name           string
		err            *apperrors.AppError
		expectedStatus int
		expectedCode   string
	}{
		{"NotFound", apperrors.NotFound("x", "1"), http.StatusNotFound, "NOT_FOUND"},
		{"Unauthorized", apperrors.Unauthorized("x"), http.StatusUnauthorized, "UNAUTHORIZED"},
		{"Forbidden", apperrors.Forbidden("x"), http.StatusForbidden, "FORBIDDEN"},
		{"BadRequest", apperrors.BadRequest("x"), http.StatusBadRequest, "BAD_REQUEST"},
		{"Conflict", apperrors.Conflict("x"), http.StatusConflict, "CONFLICT"},
		{"Internal", apperrors.Internal("x", nil), http.StatusInternalServerError, "INTERNAL_ERROR"},
		{"Validation", apperrors.Validation("f", "x"), http.StatusUnprocessableEntity, "VALIDATION_ERROR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.Status != tt.expectedStatus {
				t.Errorf("status: expected %d, got %d", tt.expectedStatus, tt.err.Status)
			}
			if tt.err.Code != tt.expectedCode {
				t.Errorf("code: expected %s, got %s", tt.expectedCode, tt.err.Code)
			}
		})
	}
}
