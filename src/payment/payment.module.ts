import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { StripeService } from '../stripe/stripe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeWebhookController } from './providers/payment_webhook';
import { EmailService } from '..//utils/middleware/email.middleware';

@Module({
  controllers: [PaymentController, StripeWebhookController],
  providers: [PaymentService, StripeService, EmailService],
  imports: [PrismaModule]
})
export class PaymentModule {}
