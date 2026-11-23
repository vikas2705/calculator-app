// Package api wires the HTTP layer: routing, request decoding, validation and JSON responses.
package api

import (
	"net/http"
	"os"

	"calculator/internal/docs"
)

// NewRouter returns the application's HTTP handler.
// staticDir holds the built frontend. It is served at "/".
func NewRouter(staticDir string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/calculate", handleCalculate)
	mux.HandleFunc("/api/v1/calculate", handleMethodNotAllowed(http.MethodPost))
	mux.HandleFunc("/api/", handleAPINotFound)

	mux.HandleFunc("GET /health", handleHealth)
	mux.Handle("GET /openapi.json", docs.SpecHandler())
	mux.Handle("GET /docs", docs.UIHandler())

	mux.Handle("/", http.FileServerFS(os.DirFS(staticDir)))

	return withRequestLogging(mux)
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleMethodNotAllowed(allowed string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", allowed)
		writeError(w, http.StatusMethodNotAllowed, CodeMethodNotAllowed,
			"Method "+r.Method+" is not allowed. Use "+allowed+".")
	}
}

func handleAPINotFound(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotFound, CodeNotFound, "No such API endpoint. See /docs.")
}
