import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  async createPaymentIntent(@Body() createPaymentDto: { amount: number; currency: string, idOrder: number }) {
    return this.paymentService.createPaymentIntent(createPaymentDto.amount, createPaymentDto.currency, createPaymentDto.idOrder);
  }
}