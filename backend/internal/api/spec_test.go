package api

import (
	"encoding/json"
	"slices"
	"testing"

	"calculator/internal/calculator"
	"calculator/internal/docs"
)

// TestSpecMatchesCode keeps the OpenAPI document and the code from drifting apart.
func TestSpecMatchesCode(t *testing.T) {
	var spec struct {
		Components struct {
			Schemas map[string]struct {
				Enum []string `json:"enum"`
			} `json:"schemas"`
		} `json:"components"`
	}
	if err := json.Unmarshal(docs.Spec, &spec); err != nil {
		t.Fatalf("openapi.json is not valid JSON: %v", err)
	}

	var operations []string
	for _, op := range calculator.Operations() {
		operations = append(operations, string(op))
	}
	assertSameSet(t, "Operation enum", spec.Components.Schemas["Operation"].Enum, operations)

	var codes []string
	for _, code := range ErrorCodes {
		codes = append(codes, string(code))
	}
	assertSameSet(t, "ErrorCode enum", spec.Components.Schemas["ErrorCode"].Enum, codes)
}

func assertSameSet(t *testing.T, name string, inSpec, inCode []string) {
	t.Helper()
	a, b := slices.Sorted(slices.Values(inSpec)), slices.Sorted(slices.Values(inCode))
	if !slices.Equal(a, b) {
		t.Errorf("%s out of sync:\n  spec: %v\n  code: %v", name, a, b)
	}
}
