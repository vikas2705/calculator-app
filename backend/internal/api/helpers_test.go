package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestMain(m *testing.M) {
	// Keep test output readable: request logs are not useful here.
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
	os.Exit(m.Run())
}

// do sends a request through the full router and returns the recorded response.
func do(t *testing.T, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	NewRouter(t.TempDir()).ServeHTTP(rec, req)
	return rec
}

// decodeError asserts that rec holds a well-formed JSON error and returns its code.
func decodeError(t *testing.T, rec *httptest.ResponseRecorder) ErrorCode {
	t.Helper()
	assertJSONContentType(t, rec)
	var body errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("error body is not valid JSON: %v\nbody: %s", err, rec.Body)
	}
	if body.Error.Code == "" || body.Error.Message == "" {
		t.Fatalf("error body missing code or message: %s", rec.Body)
	}
	return body.Error.Code
}

func assertJSONContentType(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if got := rec.Header().Get("Content-Type"); got != "application/json; charset=utf-8" {
		t.Errorf("Content-Type = %q, want application/json; charset=utf-8", got)
	}
}

func assertStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Fatalf("status = %d, want %d\nbody: %s", rec.Code, want, rec.Body)
	}
}
