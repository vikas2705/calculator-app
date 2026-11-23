package api

import (
	"errors"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"calculator/internal/calculator"
)

// Go's encoding/json cannot encode Inf or NaN. The calculator never returns
// them, but if it ever did, the client must get a clean JSON 500, not a broken body.
func TestWriteJSONNonFiniteFallsBackTo500(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSON(rec, http.StatusOK, calculateResponse{Result: math.Inf(1)})

	assertStatus(t, rec, http.StatusInternalServerError)
	if got := decodeError(t, rec); got != CodeInternal {
		t.Errorf("code = %s, want %s", got, CodeInternal)
	}
}

// Every error the calculator can return must map to a deliberate API error,
// otherwise it would surface as a generic 500.
func TestEveryCalculatorErrorIsMapped(t *testing.T) {
	all := []error{
		calculator.ErrUnknownOperation, calculator.ErrOperandCount, calculator.ErrNonFiniteOperand,
		calculator.ErrDivisionByZero, calculator.ErrNegativeSqrt, calculator.ErrUndefinedResult, calculator.ErrOverflow,
	}
	for _, err := range all {
		mapped, ok := domainErrors[err]
		if !ok {
			t.Errorf("calculator error %q has no API mapping", err)
			continue
		}
		if mapped.status >= 500 {
			t.Errorf("calculator error %q maps to server error %d", err, mapped.status)
		}
	}
	if _, ok := domainErrors[errors.New("other")]; ok {
		t.Error("unexpected mapping for an unknown error")
	}
}
