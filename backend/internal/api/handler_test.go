package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

const calculatePath = "/api/v1/calculate"

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"add", `{"operation":"add","operands":[2,3]}`, 5},
		{"subtract", `{"operation":"subtract","operands":[10,4]}`, 6},
		{"multiply", `{"operation":"multiply","operands":[6,7]}`, 42},
		{"divide", `{"operation":"divide","operands":[10,4]}`, 2.5},
		{"power", `{"operation":"power","operands":[2,10]}`, 1024},
		{"sqrt", `{"operation":"sqrt","operands":[9]}`, 3},
		{"percentage", `{"operation":"percentage","operands":[50]}`, 0.5},
		{"zero operands are real zeros, not missing", `{"operation":"add","operands":[0,0]}`, 0},
		{"negative zero result is plain zero", `{"operation":"multiply","operands":[-5,0]}`, 0},
		{"decimals and exponent notation", `{"operation":"multiply","operands":[1.5e2,-2E-1]}`, -30},
		{"largest double is accepted", `{"operation":"add","operands":[1.7976931348623157e308,0]}`, 1.7976931348623157e308},
		{"fields in any order", `{"operands":[1,2],"operation":"add"}`, 3},
		{"surrounding whitespace is fine", " \n\t{\"operation\":\"add\",\"operands\":[1,2]}\n\n ", 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, http.MethodPost, calculatePath, tt.body)

			assertStatus(t, rec, http.StatusOK)
			assertJSONContentType(t, rec)
			var got calculateResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("invalid JSON response: %v", err)
			}
			if got.Result != tt.want {
				t.Errorf("result = %v, want %v", got.Result, tt.want)
			}
			if strings.Contains(rec.Body.String(), "-0") && tt.want == 0 {
				t.Errorf("response contains negative zero: %s", rec.Body)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   ErrorCode
	}{
		// Malformed JSON.
		{"empty body", ``, 400, CodeInvalidJSON},
		{"whitespace only", "  \n ", 400, CodeInvalidJSON},
		{"not JSON", `hello`, 400, CodeInvalidJSON},
		{"truncated JSON", `{"operation":"add","operands":[1,`, 400, CodeInvalidJSON},
		{"array instead of object", `[1,2]`, 400, CodeInvalidJSON},
		{"string instead of object", `"add"`, 400, CodeInvalidJSON},
		{"trailing object", `{"operation":"add","operands":[1,2]}{}`, 400, CodeInvalidJSON},
		{"trailing garbage", `{"operation":"add","operands":[1,2]} x`, 400, CodeInvalidJSON},
		{"unknown field", `{"operation":"add","operands":[1,2],"extra":true}`, 400, CodeInvalidJSON},
		{"operands as strings", `{"operation":"add","operands":["1","2"]}`, 400, CodeInvalidJSON},
		{"operands not an array", `{"operation":"sqrt","operands":9}`, 400, CodeInvalidJSON},
		{"operation not a string", `{"operation":1,"operands":[1,2]}`, 400, CodeInvalidJSON},
		{"number out of double range", `{"operation":"add","operands":[1e999,1]}`, 400, CodeInvalidJSON},
		{"NaN literal", `{"operation":"add","operands":[NaN,1]}`, 400, CodeInvalidJSON},
		{"Infinity literal", `{"operation":"add","operands":[Infinity,1]}`, 400, CodeInvalidJSON},
		{"hex number", `{"operation":"add","operands":[0x10,1]}`, 400, CodeInvalidJSON},
		{"leading plus sign", `{"operation":"add","operands":[+1,1]}`, 400, CodeInvalidJSON},

		// Invalid operation.
		{"null body has no operation", `null`, 400, CodeInvalidOperation},
		{"empty object", `{}`, 400, CodeInvalidOperation},
		{"missing operation", `{"operands":[1,2]}`, 400, CodeInvalidOperation},
		{"empty operation", `{"operation":"","operands":[1,2]}`, 400, CodeInvalidOperation},
		{"unknown operation", `{"operation":"modulo","operands":[1,2]}`, 400, CodeInvalidOperation},
		{"operation is case sensitive", `{"operation":"ADD","operands":[1,2]}`, 400, CodeInvalidOperation},
		{"operation with spaces", `{"operation":" add ","operands":[1,2]}`, 400, CodeInvalidOperation},

		// Invalid operands.
		{"missing operands", `{"operation":"add"}`, 400, CodeInvalidOperands},
		{"null operands", `{"operation":"add","operands":null}`, 400, CodeInvalidOperands},
		{"empty operands", `{"operation":"add","operands":[]}`, 400, CodeInvalidOperands},
		{"too few for binary", `{"operation":"divide","operands":[1]}`, 400, CodeInvalidOperands},
		{"too many for binary", `{"operation":"add","operands":[1,2,3]}`, 400, CodeInvalidOperands},
		{"too many for unary", `{"operation":"sqrt","operands":[4,9]}`, 400, CodeInvalidOperands},
		{"null operand would otherwise be zero", `{"operation":"divide","operands":[5,null]}`, 400, CodeInvalidOperands},

		// Domain errors.
		{"division by zero", `{"operation":"divide","operands":[1,0]}`, 422, CodeDivisionByZero},
		{"division by negative zero", `{"operation":"divide","operands":[1,-0]}`, 422, CodeDivisionByZero},
		{"zero to a negative power", `{"operation":"power","operands":[0,-2]}`, 422, CodeDivisionByZero},
		{"square root of negative", `{"operation":"sqrt","operands":[-4]}`, 422, CodeNegativeSqrt},
		{"undefined power", `{"operation":"power","operands":[-8,0.5]}`, 422, CodeUndefinedResult},
		{"overflow", `{"operation":"multiply","operands":[1e308,10]}`, 422, CodeOverflow},
		{"power overflow", `{"operation":"power","operands":[10,400]}`, 422, CodeOverflow},

		// Size limit.
		{"body over 1 KiB", `{"operation":"add","operands":[1,2],"pad":"` + strings.Repeat("x", 2000) + `"}`, 413, CodePayloadTooLarge},
		{"oversized trailing data", `{"operation":"add","operands":[1,2]}` + strings.Repeat(" ", 2000) + `x`, 413, CodePayloadTooLarge},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, http.MethodPost, calculatePath, tt.body)

			assertStatus(t, rec, tt.wantStatus)
			if got := decodeError(t, rec); got != tt.wantCode {
				t.Errorf("code = %s, want %s", got, tt.wantCode)
			}
		})
	}
}
