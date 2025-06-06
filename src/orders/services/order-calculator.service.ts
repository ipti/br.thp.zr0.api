import { Injectable } from '@nestjs/common';
import { OrderCalculationResult } from '../entities/order-calculation-result.entity';
import { OrderContext } from '../entities/order-context.entity';
import { OrderItemInput } from '../entities/order-item-input.entity';
import { ShippingContext } from '../../shipping/entities/shipping-context.entity';
import { PaymentStrategy } from '../strategies/payment/payment.strategy';
import { ShippingStrategy } from '../strategies/shipping/shipping.strategy';

@Injectable()
export class OrderCalculatorService {
  constructor(
    private readonly shippingStrategy: ShippingStrategy,
    private readonly paymentStrategy: PaymentStrategy,
  ) {}

  async calculate(
    orderItems: OrderItemInput[],
    context: OrderContext,
  ): Promise<OrderCalculationResult> {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const shippingContext: ShippingContext = {
      destinationZipCode: context.shippingAddress.zipCode,
      originZipCode: '',
      products: [],
    };

    const shipping = await this.shippingStrategy.calculate(shippingContext);
    const paymentFee = this.paymentStrategy.calculate(subtotal + shipping);

    const total = subtotal + shipping + paymentFee;

    return {
      subtotal,
      shipping,
      paymentFee,
      total,
    };
  }
}
