package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"calculator/internal/calculator"
)

// maxBodyBytes caps request bodies. A valid request is well under 200 bytes.
const maxBodyBytes = 1024

type calculateRequest struct {
	Operation string `json:"operation"`
	// Pointers let us tell an explicit null apart from 0. A plain float64
	// would silently turn [5, null] into [5, 0].
	Operands []*float64 `json:"operands"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

// apiError is a client-facing failure: HTTP status, stable code, readable message.
type apiError struct {
	status  int
	code    ErrorCode
	message string
}

// domainErrors maps calculator errors to API errors.
var domainErrors = map[error]apiError{
	calculator.ErrDivisionByZero:   {http.StatusUnprocessableEntity, CodeDivisionByZero, "Cannot divide by zero."},
	calculator.ErrNegativeSqrt:     {http.StatusUnprocessableEntity, CodeNegativeSqrt, "Cannot take the square root of a negative number."},
	calculator.ErrUndefinedResult:  {http.StatusUnprocessableEntity, CodeUndefinedResult, "The result is undefined."},
	calculator.ErrOverflow:         {http.StatusUnprocessableEntity, CodeOverflow, "The result is too large."},
	calculator.ErrUnknownOperation: {http.StatusBadRequest, CodeInvalidOperation, "Unknown operation."},
	calculator.ErrOperandCount:     {http.StatusBadRequest, CodeInvalidOperands, "Wrong number of operands."},
	calculator.ErrNonFiniteOperand: {http.StatusBadRequest, CodeInvalidOperands, "Operands must be finite numbers."},
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	var req calculateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeAPIError(w, *err)
		return
	}

	op := calculator.Operation(req.Operation)
	operands, err := validateOperands(op, req.Operands)
	if err != nil {
		writeAPIError(w, *err)
		return
	}

	result, calcErr := calculator.Calculate(op, operands)
	if calcErr != nil {
		mapped, ok := domainErrors[calcErr]
		if !ok {
			slog.Error("unmapped calculator error", "error", calcErr)
			mapped = apiError{http.StatusInternalServerError, CodeInternal, "Something went wrong."}
		}
		writeAPIError(w, mapped)
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

// decodeJSON reads exactly one JSON object from the body into dst.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) *apiError {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	err := dec.Decode(dst)
	if err == nil {
		// Anything after the first value (another object, stray text) is rejected.
		if extra := dec.Decode(&struct{}{}); !errors.Is(extra, io.EOF) {
			err = extra
			if err == nil {
				err = errors.New("trailing data")
			}
		}
	}

	var tooLarge *http.MaxBytesError
	switch {
	case err == nil:
		return nil
	case errors.As(err, &tooLarge):
		return &apiError{http.StatusRequestEntityTooLarge, CodePayloadTooLarge,
			fmt.Sprintf("Request body must not exceed %d bytes.", maxBodyBytes)}
	case errors.Is(err, io.EOF):
		return &apiError{http.StatusBadRequest, CodeInvalidJSON, "Request body is empty."}
	default:
		return &apiError{http.StatusBadRequest, CodeInvalidJSON,
			`Request body must be a single JSON object, e.g. {"operation":"add","operands":[1,2]}.`}
	}
}

func validateOperands(op calculator.Operation, raw []*float64) ([]float64, *apiError) {
	arity, ok := op.Arity()
	if !ok {
		return nil, &apiError{http.StatusBadRequest, CodeInvalidOperation,
			fmt.Sprintf(`"operation" must be one of: %s.`, operationList())}
	}
	if len(raw) != arity {
		return nil, &apiError{http.StatusBadRequest, CodeInvalidOperands,
			fmt.Sprintf(`"%s" needs exactly %d operand(s) in "operands".`, op, arity)}
	}

	operands := make([]float64, len(raw))
	for i, x := range raw {
		if x == nil {
			return nil, &apiError{http.StatusBadRequest, CodeInvalidOperands, `"operands" must not contain null.`}
		}
		operands[i] = *x
	}
	return operands, nil
}

func operationList() string {
	ops := calculator.Operations()
	names := make([]string, len(ops))
	for i, op := range ops {
		names[i] = string(op)
	}
	return strings.Join(names, ", ")
}

func writeAPIError(w http.ResponseWriter, e apiError) {
	writeError(w, e.status, e.code, e.message)
}
