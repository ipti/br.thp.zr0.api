import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '',  {
      apiVersion: '2025-09-30.clover',
    });
  }

  getStripeClient(): Stripe {
    return this.stripe;
  }
}