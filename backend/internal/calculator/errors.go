package calculator

import "errors"

// Input errors: the request itself is malformed.
var (
	ErrUnknownOperation = errors.New("unknown operation")
	ErrOperandCount     = errors.New("wrong number of operands for operation")
	ErrNonFiniteOperand = errors.New("operands must be finite numbers")
)

// Domain errors: the input is well formed, but the maths has no usable answer.
var (
	ErrDivisionByZero  = errors.New("cannot divide by zero")
	ErrNegativeSqrt    = errors.New("cannot take the square root of a negative number")
	ErrUndefinedResult = errors.New("result is undefined")
	ErrOverflow        = errors.New("result is too large to represent")
)
