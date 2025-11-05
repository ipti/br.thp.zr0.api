import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  async createPaymentIntent(@Body() createPaymentDto: { amount: number; currency: string, idOrder: number }) {
    return this.paymentService.createPaymentIntent(createPaymentDto.amount, createPaymentDto.currency, createPaymentDto.idOrder);
  }

  @Get('create-intent/:idOrder')
  async getPaymentIntent(@Param('idOrder') idOrder: number) {
    return this.paymentService.getPaymentIntent(idOrder);
  }
}