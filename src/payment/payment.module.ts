import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { StripeService } from '../stripe/stripe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeWebhookController } from './providers/payment_webhook';

@Module({
  controllers: [PaymentController, StripeWebhookController],
  providers: [PaymentService, StripeService],
  imports: [PrismaModule]
})
export class PaymentModule {}
