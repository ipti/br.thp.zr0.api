import { Module } from '@nestjs/common';
import { PaymentModule } from 'src/payment/payment.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StripeService } from 'src/stripe/stripe.service';
import { EmailService } from 'src/utils/middleware/email.middleware';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CouponModule } from 'src/coupon/coupon.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, EmailService, StripeService],
  imports: [PrismaModule, PaymentModule, CouponModule],
})
export class OrdersModule {}
