import {
  BadRequestException,
  InternalServerErrorException,
  Controller,
  Headers,
  Post,
  Req,
  Res,
  RawBodyRequest,
} from '@nestjs/common';
// import { StripeProvider } from './stripe.provider';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import Stripe from 'stripe';
import { PaymentService } from '../payment.service';

@ApiTags('StripeWebhook')
@Controller()
export class StripeWebhookController {
  private stripe: Stripe;
  

constructor(private readonly payment: PaymentService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2025-09-30.clover',
    });
  }


  @Post('stripe/webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    const rawBody = req.body;

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!endpointSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }

    if (!Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Webhook body must be raw Buffer');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid webhook signature';
      console.log(message);
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    await this.payment.handleWebhook(event);
    res.status(200).send('Webhook received');
  }
}
