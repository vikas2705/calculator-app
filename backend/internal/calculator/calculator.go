// Package calculator implements the arithmetic operations offered by the API.
//
// It is pure: no I/O, no HTTP, no global state. Every function takes numbers
// and returns a number or an error, which makes it trivial to test.
package calculator

import (
	"math"
	"slices"
)

// Operation identifies a calculator operation. Its value is the name used in the API.
type Operation string

const (
	Add        Operation = "add"
	Subtract   Operation = "subtract"
	Multiply   Operation = "multiply"
	Divide     Operation = "divide"
	Power      Operation = "power"
	Sqrt       Operation = "sqrt"
	Percentage Operation = "percentage"
)

// definition describes how many operands an operation takes and how to compute it.
type definition struct {
	arity int
	apply func(x []float64) (float64, error)
}

var definitions = map[Operation]definition{
	Add:        {arity: 2, apply: func(x []float64) (float64, error) { return x[0] + x[1], nil }},
	Subtract:   {arity: 2, apply: func(x []float64) (float64, error) { return x[0] - x[1], nil }},
	Multiply:   {arity: 2, apply: func(x []float64) (float64, error) { return x[0] * x[1], nil }},
	Divide:     {arity: 2, apply: divide},
	Power:      {arity: 2, apply: power},
	Sqrt:       {arity: 1, apply: sqrt},
	Percentage: {arity: 1, apply: func(x []float64) (float64, error) { return x[0] / 100, nil }},
}

// Operations returns every supported operation, sorted by name.
func Operations() []Operation {
	ops := make([]Operation, 0, len(definitions))
	for op := range definitions {
		ops = append(ops, op)
	}
	slices.Sort(ops)
	return ops
}

// Arity returns how many operands op takes, and false if op is not supported.
func (op Operation) Arity() (int, bool) {
	def, ok := definitions[op]
	return def.arity, ok
}

// Calculate applies op to operands.
//
// Operands must be finite and match the operation's arity. The result is
// always finite: a result too large for float64 returns ErrOverflow, and a
// mathematically undefined result returns ErrUndefinedResult. Negative zero
// is returned as plain zero.
func Calculate(op Operation, operands []float64) (float64, error) {
	def, ok := definitions[op]
	if !ok {
		return 0, ErrUnknownOperation
	}
	if len(operands) != def.arity {
		return 0, ErrOperandCount
	}
	for _, x := range operands {
		if math.IsNaN(x) || math.IsInf(x, 0) {
			return 0, ErrNonFiniteOperand
		}
	}

	result, err := def.apply(operands)
	if err != nil {
		return 0, err
	}
	return checkResult(result)
}

func divide(x []float64) (float64, error) {
	if x[1] == 0 {
		return 0, ErrDivisionByZero
	}
	return x[0] / x[1], nil
}

func power(x []float64) (float64, error) {
	base, exponent := x[0], x[1]
	// 0 raised to a negative power is 1/0. math.Pow would return +Inf,
	// which would otherwise be misreported as an overflow.
	if base == 0 && exponent < 0 {
		return 0, ErrDivisionByZero
	}
	return math.Pow(base, exponent), nil
}

func sqrt(x []float64) (float64, error) {
	if x[0] < 0 {
		return 0, ErrNegativeSqrt
	}
	return math.Sqrt(x[0]), nil
}

// checkResult turns non-finite results into errors and normalises -0 to 0.
func checkResult(r float64) (float64, error) {
	switch {
	case math.IsNaN(r):
		return 0, ErrUndefinedResult
	case math.IsInf(r, 0):
		return 0, ErrOverflow
	case r == 0:
		return 0, nil // also turns -0 into 0
	default:
		return r, nil
	}
}
