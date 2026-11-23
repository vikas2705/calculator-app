package calculator

import (
	"errors"
	"math"
	"testing"
)

// FuzzCalculateNumbers checks, for every operation and arbitrary finite
// operands, that Calculate returns either a known error or a finite,
// non-negative-zero result.
//
// Run longer with: go test ./internal/calculator -run '^$' -fuzz FuzzCalculateNumbers -fuzztime 60s
func FuzzCalculateNumbers(f *testing.F) {
	f.Add(uint8(0), 1.0, 2.0)
	f.Add(uint8(3), 1.0, 0.0)
	f.Add(uint8(4), -8.0, 0.5)
	f.Add(uint8(4), 10.0, 400.0)
	f.Add(uint8(5), -1.0, 0.0)
	f.Add(uint8(2), -5.0, 0.0)

	ops := Operations()
	known := []error{
		ErrDivisionByZero, ErrNegativeSqrt, ErrUndefinedResult, ErrOverflow, ErrNonFiniteOperand,
	}

	f.Fuzz(func(t *testing.T, opIndex uint8, a, b float64) {
		op := ops[int(opIndex)%len(ops)]
		arity, _ := op.Arity()
		operands := []float64{a, b}[:arity]

		got, err := Calculate(op, operands)
		if err != nil {
			for _, k := range known {
				if errors.Is(err, k) {
					return
				}
			}
			t.Fatalf("%s%v: unexpected error %v", op, operands, err)
		}
		if math.IsNaN(got) || math.IsInf(got, 0) {
			t.Fatalf("%s%v = %v, want a finite result", op, operands, got)
		}
		if got == 0 && math.Signbit(got) {
			t.Fatalf("%s%v returned negative zero", op, operands)
		}
	})
}
