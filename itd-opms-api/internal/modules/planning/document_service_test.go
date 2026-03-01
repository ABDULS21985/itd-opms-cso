package planning

import (
	"testing"
)

// ──────────────────────────────────────────────
// MaxFileSize constant
// ──────────────────────────────────────────────

func TestMaxFileSize_Is50MB(t *testing.T) {
	const expected = 50 << 20 // 50 MB = 52_428_800 bytes
	if MaxFileSize != expected {
		t.Errorf("MaxFileSize = %d, expected %d (50 MB)", MaxFileSize, expected)
	}
}

func TestMaxFileSize_NumericValue(t *testing.T) {
	if MaxFileSize != 52_428_800 {
		t.Errorf("MaxFileSize = %d, expected 52428800", MaxFileSize)
	}
}

// ──────────────────────────────────────────────
// AllowedContentTypes map
// ──────────────────────────────────────────────

func TestAllowedContentTypes_ContainsExpectedTypes(t *testing.T) {
	expected := []string{
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-powerpoint",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"image/png",
		"image/jpeg",
		"image/gif",
		"text/plain",
		"text/csv",
		"application/zip",
	}

	for _, ct := range expected {
		t.Run(ct, func(t *testing.T) {
			if !AllowedContentTypes[ct] {
				t.Errorf("expected content type %q to be allowed", ct)
			}
		})
	}
}

func TestAllowedContentTypes_Count(t *testing.T) {
	if len(AllowedContentTypes) != 13 {
		t.Errorf("expected 13 allowed content types, got %d", len(AllowedContentTypes))
	}
}

func TestAllowedContentTypes_RejectsDisallowedTypes(t *testing.T) {
	disallowed := []string{
		"application/octet-stream",
		"application/javascript",
		"text/html",
		"application/x-executable",
		"video/mp4",
		"audio/mpeg",
		"",
	}

	for _, ct := range disallowed {
		name := ct
		if name == "" {
			name = "empty"
		}
		t.Run(name, func(t *testing.T) {
			if AllowedContentTypes[ct] {
				t.Errorf("expected content type %q to be disallowed", ct)
			}
		})
	}
}

// ──────────────────────────────────────────────
// AllowedContentTypes — PDF and Office suites
// ──────────────────────────────────────────────

func TestAllowedContentTypes_PDFIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/pdf"] {
		t.Error("application/pdf should be an allowed content type")
	}
}

func TestAllowedContentTypes_WordDocIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/msword"] {
		t.Error("application/msword should be an allowed content type")
	}
}

func TestAllowedContentTypes_DocxIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] {
		t.Error("docx content type should be allowed")
	}
}

func TestAllowedContentTypes_ExcelIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/vnd.ms-excel"] {
		t.Error("application/vnd.ms-excel should be allowed")
	}
}

func TestAllowedContentTypes_XlsxIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] {
		t.Error("xlsx content type should be allowed")
	}
}

func TestAllowedContentTypes_PowerPointIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/vnd.ms-powerpoint"] {
		t.Error("application/vnd.ms-powerpoint should be allowed")
	}
}

func TestAllowedContentTypes_PptxIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/vnd.openxmlformats-officedocument.presentationml.presentation"] {
		t.Error("pptx content type should be allowed")
	}
}

// ──────────────────────────────────────────────
// AllowedContentTypes — images
// ──────────────────────────────────────────────

func TestAllowedContentTypes_PNGIsAllowed(t *testing.T) {
	if !AllowedContentTypes["image/png"] {
		t.Error("image/png should be allowed")
	}
}

func TestAllowedContentTypes_JPEGIsAllowed(t *testing.T) {
	if !AllowedContentTypes["image/jpeg"] {
		t.Error("image/jpeg should be allowed")
	}
}

func TestAllowedContentTypes_GIFIsAllowed(t *testing.T) {
	if !AllowedContentTypes["image/gif"] {
		t.Error("image/gif should be allowed")
	}
}

// ──────────────────────────────────────────────
// AllowedContentTypes — text and archives
// ──────────────────────────────────────────────

func TestAllowedContentTypes_PlainTextIsAllowed(t *testing.T) {
	if !AllowedContentTypes["text/plain"] {
		t.Error("text/plain should be allowed")
	}
}

func TestAllowedContentTypes_CSVIsAllowed(t *testing.T) {
	if !AllowedContentTypes["text/csv"] {
		t.Error("text/csv should be allowed")
	}
}

func TestAllowedContentTypes_ZipIsAllowed(t *testing.T) {
	if !AllowedContentTypes["application/zip"] {
		t.Error("application/zip should be allowed")
	}
}

// ──────────────────────────────────────────────
// AllowedContentTypes — map values are true
// ──────────────────────────────────────────────

func TestAllowedContentTypes_AllValuesAreTrue(t *testing.T) {
	for ct, v := range AllowedContentTypes {
		if !v {
			t.Errorf("AllowedContentTypes[%q] = false, expected true", ct)
		}
	}
}
