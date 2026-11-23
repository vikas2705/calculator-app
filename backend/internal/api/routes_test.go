package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHealth(t *testing.T) {
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		t.Run(method, func(t *testing.T) {
			rec := do(t, method, "/health", "")
			assertStatus(t, rec, http.StatusOK)
			assertJSONContentType(t, rec)
			if method == http.MethodGet && strings.TrimSpace(rec.Body.String()) != `{"status":"ok"}` {
				t.Errorf("body = %s, want {\"status\":\"ok\"}", rec.Body)
			}
		})
	}
}

func TestCalculateWrongMethod(t *testing.T) {
	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodPatch, http.MethodDelete} {
		t.Run(method, func(t *testing.T) {
			rec := do(t, method, calculatePath, "")
			assertStatus(t, rec, http.StatusMethodNotAllowed)
			if got := decodeError(t, rec); got != CodeMethodNotAllowed {
				t.Errorf("code = %s, want %s", got, CodeMethodNotAllowed)
			}
			if allow := rec.Header().Get("Allow"); allow != http.MethodPost {
				t.Errorf("Allow = %q, want POST", allow)
			}
		})
	}
}

func TestUnknownAPIPath(t *testing.T) {
	for _, path := range []string{"/api/", "/api/v1/", "/api/v1/add", "/api/v2/calculate"} {
		t.Run(path, func(t *testing.T) {
			rec := do(t, http.MethodPost, path, `{}`)
			assertStatus(t, rec, http.StatusNotFound)
			if got := decodeError(t, rec); got != CodeNotFound {
				t.Errorf("code = %s, want %s", got, CodeNotFound)
			}
		})
	}
}

func TestDocsRoutes(t *testing.T) {
	rec := do(t, http.MethodGet, "/openapi.json", "")
	assertStatus(t, rec, http.StatusOK)
	assertJSONContentType(t, rec)
	if !json.Valid(rec.Body.Bytes()) {
		t.Error("/openapi.json is not valid JSON")
	}

	rec = do(t, http.MethodGet, "/docs", "")
	assertStatus(t, rec, http.StatusOK)
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Errorf("/docs Content-Type = %q, want text/html", ct)
	}
	if !strings.Contains(rec.Body.String(), `url: "/openapi.json"`) {
		t.Error("/docs page does not load /openapi.json")
	}
}

func TestStaticFiles(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "index.html"), "<h1>calculator</h1>")
	writeFile(t, filepath.Join(dir, "assets", "app.js"), "console.log(1)")
	router := NewRouter(dir)

	get := func(path string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		return rec
	}

	if rec := get("/"); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "calculator") {
		t.Errorf("GET / = %d %q, want index.html", rec.Code, rec.Body)
	}
	if rec := get("/assets/app.js"); rec.Code != http.StatusOK {
		t.Errorf("GET /assets/app.js = %d, want 200", rec.Code)
	}
	if rec := get("/missing.js"); rec.Code != http.StatusNotFound {
		t.Errorf("GET /missing.js = %d, want 404", rec.Code)
	}
	if rec := get("/../../etc/passwd"); rec.Code == http.StatusOK && strings.Contains(rec.Body.String(), "root:") {
		t.Error("path traversal escaped the static directory")
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
