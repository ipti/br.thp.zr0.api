export interface PaymentStrategy {
  calculate(amount: number): number;
}
