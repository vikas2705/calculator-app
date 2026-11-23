/** Operations supported by the backend (POST /api/v1/calculate). */
export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'
export type UnaryOperation = 'sqrt' | 'percentage'
export type Operation = BinaryOperation | UnaryOperation

/** Request body for one backend calculation. */
export interface CalcRequest {
  operation: Operation
  operands: number[]
}

/** How each binary operator is written in the expression line. */
export const OPERATOR_SYMBOL: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
}
