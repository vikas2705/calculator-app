// Package docs serves the OpenAPI specification and a Swagger UI page for it.
package docs

import (
	_ "embed"
	"net/http"
)

// Spec is the OpenAPI 3 document describing the API.
//
//go:embed openapi.json
var Spec []byte

//go:embed swagger.html
var swaggerPage []byte

// SpecHandler serves the OpenAPI document.
func SpecHandler() http.Handler {
	return staticBytes("application/json; charset=utf-8", Spec)
}

// UIHandler serves the Swagger UI page, which loads the spec from /openapi.json.
func UIHandler() http.Handler {
	return staticBytes("text/html; charset=utf-8", swaggerPage)
}

func staticBytes(contentType string, body []byte) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", contentType)
		_, _ = w.Write(body)
	})
}
