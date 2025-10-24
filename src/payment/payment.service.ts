import { Injectable } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PaymentService {
  constructor(private readonly stripeService: StripeService) {}

  async createPaymentIntent(amount: number, currency: string) {
    const stripe = this.stripeService.getStripeClient();

    return await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });
  }
}