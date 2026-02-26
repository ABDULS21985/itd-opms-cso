package errors_test

import (
	"fmt"
	"net/http"
	"testing"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
)

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

	// Error message should include both message and wrapped error.
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

func TestAppErrorUnwrap(t *testing.T) {
	cause := fmt.Errorf("original")
	err := apperrors.Internal("wrapper", cause)

	// errors.As is already tested implicitly by HTTPStatus/Code. This tests
	// that Unwrap returns the inner error for errors.Is/As chains.
	unwrapped := err.Unwrap()
	if unwrapped == nil {
		t.Fatal("expected non-nil unwrapped error")
	}
	if unwrapped.Error() != "original" {
		t.Errorf("expected 'original', got %q", unwrapped.Error())
	}
}
