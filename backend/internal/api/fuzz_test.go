package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
)

// FuzzCalculate sends arbitrary bodies to the endpoint and checks the
// invariants that must hold for any input:
//   - never a 5xx
//   - always a valid JSON body
//   - a 200 always has a numeric result; anything else has a known error code
//
// Run longer with: go test ./internal/api -run '^$' -fuzz FuzzCalculate -fuzztime 60s
func FuzzCalculate(f *testing.F) {
	seeds := []string{
		``, `{}`, `null`, `[]`, `"x"`,
		`{"operation":"add","operands":[1,2]}`,
		`{"operation":"divide","operands":[1,0]}`,
		`{"operation":"power","operands":[-8,0.5]}`,
		`{"operation":"power","operands":[10,400]}`,
		`{"operation":"sqrt","operands":[-1]}`,
		`{"operation":"percentage","operands":[5e-324]}`,
		`{"operation":"multiply","operands":[-1e308,1e308]}`,
		`{"operation":"add","operands":[1,null]}`,
		`{"operation":"add","operands":[1e999,1]}`,
		`{"operation":"add","operands":[1,2]}{}`,
	}
	for _, s := range seeds {
		f.Add([]byte(s))
	}

	router := NewRouter(f.TempDir())

	f.Fuzz(func(t *testing.T, body []byte) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, calculatePath, strings.NewReader(string(body)))
		router.ServeHTTP(rec, req)

		if rec.Code >= 500 {
			t.Fatalf("status %d for body %q: %s", rec.Code, body, rec.Body)
		}

		var resp struct {
			Result *float64     `json:"result"`
			Error  *errorDetail `json:"error"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("invalid JSON response for body %q: %v\n%s", body, err, rec.Body)
		}

		if rec.Code == http.StatusOK {
			if resp.Result == nil {
				t.Fatalf("200 without result for body %q: %s", body, rec.Body)
			}
			return
		}
		if resp.Error == nil || !slices.Contains(ErrorCodes, resp.Error.Code) {
			t.Fatalf("status %d without a known error code for body %q: %s", rec.Code, body, rec.Body)
		}
	})
}
