package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// ErrorCode is a stable, machine-readable error identifier returned to clients.
type ErrorCode string

const (
	CodeInvalidJSON      ErrorCode = "INVALID_JSON"
	CodeInvalidOperation ErrorCode = "INVALID_OPERATION"
	CodeInvalidOperands  ErrorCode = "INVALID_OPERANDS"
	CodePayloadTooLarge  ErrorCode = "PAYLOAD_TOO_LARGE"
	CodeDivisionByZero   ErrorCode = "DIVISION_BY_ZERO"
	CodeNegativeSqrt     ErrorCode = "NEGATIVE_SQRT"
	CodeUndefinedResult  ErrorCode = "UNDEFINED_RESULT"
	CodeOverflow         ErrorCode = "OVERFLOW"
	CodeMethodNotAllowed ErrorCode = "METHOD_NOT_ALLOWED"
	CodeNotFound         ErrorCode = "NOT_FOUND"
	CodeInternal         ErrorCode = "INTERNAL_ERROR"
)

// ErrorCodes lists every code the API can return. The OpenAPI spec is tested against it.
var ErrorCodes = []ErrorCode{
	CodeInvalidJSON, CodeInvalidOperation, CodeInvalidOperands, CodePayloadTooLarge,
	CodeDivisionByZero, CodeNegativeSqrt, CodeUndefinedResult, CodeOverflow,
	CodeMethodNotAllowed, CodeNotFound, CodeInternal,
}

type errorResponse struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
}

// writeJSON encodes v before writing anything, so an encoding failure can
// still produce a clean 500 instead of a half-written response.
func writeJSON(w http.ResponseWriter, status int, v any) {
	body, err := json.Marshal(v)
	if err != nil {
		slog.Error("encoding response", "error", err)
		status = http.StatusInternalServerError
		body = []byte(`{"error":{"code":"INTERNAL_ERROR","message":"Something went wrong."}}`)
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(append(body, '\n'))
}

func writeError(w http.ResponseWriter, status int, code ErrorCode, message string) {
	writeJSON(w, status, errorResponse{Error: errorDetail{Code: code, Message: message}})
}
