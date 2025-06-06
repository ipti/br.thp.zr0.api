import { ShippingContext } from 'src/shipping/entities/shipping-context.entity';

export interface ShippingStrategy {
  calculate(context: ShippingContext): Promise<number>;
}
