import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  async createPaymentIntent(@Body() createPaymentDto: { amount: number; currency: string, idOrder: number }) {
    return this.paymentService.createPaymentIntent(createPaymentDto.amount, createPaymentDto.currency, createPaymentDto.idOrder);
  }

  @Patch ('refund-payment-intent')
  async refundPaymentIntent(@Body() createPaymentDto: { amount: number; idOrder: number }) {
    return this.paymentService.refundPaymentIntent(createPaymentDto.amount, createPaymentDto.idOrder);
  }


  @Get('create-intent/:idOrder')
  async getPaymentIntent(@Param('idOrder') idOrder: number) {
    return this.paymentService.getPaymentIntent(idOrder);
  }
}