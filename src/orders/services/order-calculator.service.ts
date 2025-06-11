import { Injectable } from '@nestjs/common';
import { OrderCalculationResult } from '../entities/order-calculation-result.entity';
import { OrderContext } from '../entities/order-context.entity';
import { OrderItemInput } from '../entities/order-item-input.entity';
import { PaymentStrategy } from '../strategies/payment/payment.strategy';

@Injectable()
export class OrderCalculatorService {
  constructor(private readonly paymentStrategy: PaymentStrategy) { }

  calculate(
    orderItems: OrderItemInput[],
    context: OrderContext,
  ): OrderCalculationResult {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const paymentFee = this.paymentStrategy.calculate(subtotal);

    const total = subtotal + paymentFee;

    return {
      subtotal,
      paymentFee,
      total,
    };
  }
}
