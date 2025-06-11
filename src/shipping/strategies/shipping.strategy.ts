import { ShippingContext } from '../entities/shipping-context.entity';
import { ShippingCalculationResult } from '../entities/shipping-result.entity';

export interface ShippingStrategy {
  calculate(context: ShippingContext): Promise<ShippingCalculationResult>;
}
