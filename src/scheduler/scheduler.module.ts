import { Module } from '@nestjs/common';
import { CheckoutModule } from '../checkout/checkout.module';
import { ProductionOrderModule } from '../production-order/production-order.module';
import { ReservationCleanupScheduler } from './reservation-cleanup.scheduler';

@Module({
  imports: [CheckoutModule, ProductionOrderModule],
  providers: [ReservationCleanupScheduler],
})
export class SchedulerModule {}
