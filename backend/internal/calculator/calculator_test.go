package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name     string
		op       Operation
		operands []float64
		want     float64
		wantErr  error
	}{
		// add
		{"add integers", Add, []float64{2, 3}, 5, nil},
		{"add negatives", Add, []float64{-2, -3}, -5, nil},
		{"add decimals keeps float64 noise", Add, []float64{0.1, 0.2}, 0.30000000000000004, nil},
		{"add opposite values gives zero", Add, []float64{5, -5}, 0, nil},
		{"add overflow", Add, []float64{math.MaxFloat64, math.MaxFloat64}, 0, ErrOverflow},
		{"add negative overflow", Add, []float64{-math.MaxFloat64, -math.MaxFloat64}, 0, ErrOverflow},

		// subtract
		{"subtract", Subtract, []float64{10, 4}, 6, nil},
		{"subtract into negative", Subtract, []float64{4, 10}, -6, nil},
		{"subtract overflow", Subtract, []float64{-math.MaxFloat64, math.MaxFloat64}, 0, ErrOverflow},

		// multiply
		{"multiply", Multiply, []float64{6, 7}, 42, nil},
		{"multiply by zero", Multiply, []float64{123.456, 0}, 0, nil},
		{"multiply negative by zero is not -0", Multiply, []float64{-5, 0}, 0, nil},
		{"multiply overflow", Multiply, []float64{1e308, 10}, 0, ErrOverflow},
		{"multiply underflow becomes zero", Multiply, []float64{1e-300, 1e-300}, 0, nil},

		// divide
		{"divide", Divide, []float64{10, 4}, 2.5, nil},
		{"divide negative", Divide, []float64{-9, 3}, -3, nil},
		{"divide zero by number", Divide, []float64{0, 5}, 0, nil},
		{"divide by zero", Divide, []float64{1, 0}, 0, ErrDivisionByZero},
		{"divide zero by zero", Divide, []float64{0, 0}, 0, ErrDivisionByZero},
		{"divide by negative zero", Divide, []float64{1, math.Copysign(0, -1)}, 0, ErrDivisionByZero},
		{"divide overflow", Divide, []float64{1e308, 1e-10}, 0, ErrOverflow},

		// power
		{"power", Power, []float64{2, 10}, 1024, nil},
		{"power fractional exponent", Power, []float64{9, 0.5}, 3, nil},
		{"power negative exponent", Power, []float64{2, -2}, 0.25, nil},
		{"power zero to zero is one", Power, []float64{0, 0}, 1, nil},
		{"power negative base integer exponent", Power, []float64{-2, 3}, -8, nil},
		{"power zero to negative is division by zero", Power, []float64{0, -1}, 0, ErrDivisionByZero},
		{"power negative zero to negative", Power, []float64{math.Copysign(0, -1), -1}, 0, ErrDivisionByZero},
		{"power negative base fractional exponent", Power, []float64{-8, 0.5}, 0, ErrUndefinedResult},
		{"power overflow", Power, []float64{10, 400}, 0, ErrOverflow},
		{"power negative overflow", Power, []float64{-10, 309}, 0, ErrOverflow},
		{"power underflow becomes zero", Power, []float64{10, -400}, 0, nil},

		// sqrt
		{"sqrt", Sqrt, []float64{9}, 3, nil},
		{"sqrt of zero", Sqrt, []float64{0}, 0, nil},
		{"sqrt of negative zero is zero", Sqrt, []float64{math.Copysign(0, -1)}, 0, nil},
		{"sqrt irrational", Sqrt, []float64{2}, math.Sqrt2, nil},
		{"sqrt of negative", Sqrt, []float64{-1}, 0, ErrNegativeSqrt},
		{"sqrt of max float", Sqrt, []float64{math.MaxFloat64}, math.Sqrt(math.MaxFloat64), nil},

		// percentage
		{"percentage", Percentage, []float64{50}, 0.5, nil},
		{"percentage of negative", Percentage, []float64{-25}, -0.25, nil},
		{"percentage of decimal", Percentage, []float64{12.5}, 0.125, nil},
		{"percentage of zero", Percentage, []float64{0}, 0, nil},
		{"percentage of smallest float underflows to zero", Percentage, []float64{math.SmallestNonzeroFloat64}, 0, nil},

		// invalid input
		{"unknown operation", Operation("modulo"), []float64{1, 2}, 0, ErrUnknownOperation},
		{"empty operation", Operation(""), []float64{1, 2}, 0, ErrUnknownOperation},
		{"too few operands", Add, []float64{1}, 0, ErrOperandCount},
		{"too many operands", Sqrt, []float64{1, 2}, 0, ErrOperandCount},
		{"no operands", Add, nil, 0, ErrOperandCount},
		{"NaN operand", Add, []float64{math.NaN(), 1}, 0, ErrNonFiniteOperand},
		{"infinite operand", Sqrt, []float64{math.Inf(1)}, 0, ErrNonFiniteOperand},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("result = %v, want %v", got, tt.want)
			}
			if math.Signbit(got) && got == 0 {
				t.Errorf("result is negative zero, want plain zero")
			}
		})
	}
}

func TestOperationsAndArity(t *testing.T) {
	want := map[Operation]int{
		Add: 2, Subtract: 2, Multiply: 2, Divide: 2, Power: 2,
		Sqrt: 1, Percentage: 1,
	}

	ops := Operations()
	if len(ops) != len(want) {
		t.Fatalf("Operations() returned %d operations, want %d: %v", len(ops), len(want), ops)
	}
	for i, op := range ops {
		if i > 0 && ops[i-1] >= op {
			t.Errorf("Operations() not sorted: %v", ops)
		}
		arity, ok := op.Arity()
		if !ok || arity != want[op] {
			t.Errorf("%s.Arity() = (%d, %v), want (%d, true)", op, arity, ok, want[op])
		}
	}

	if _, ok := Operation("modulo").Arity(); ok {
		t.Error(`Operation("modulo").Arity() reported ok for an unsupported operation`)
	}
}
