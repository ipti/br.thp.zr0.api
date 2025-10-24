import {
  Controller,
  Headers,
  Post,
  Req,
  Res,
  RawBodyRequest,
  UseInterceptors,
} from '@nestjs/common';
// import { StripeProvider } from './stripe.provider';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import Stripe from 'stripe';
import { RawBodyInterceptor } from '../../utils/rawBodyInterceptor';

@ApiTags('StripeWebhook')
@Controller()
@UseInterceptors(RawBodyInterceptor)
export class StripeWebhookController {
  private stripe: Stripe;

//   constructor(private readonly stripeProvider: StripeProvider) {
//     this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//       apiVersion: '2025-02-24.acacia',
//     });
//   }

  @Post('stripe/webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

    const rawBody = req.rawBody ?? '';

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // await this.stripeProvider.handleWebhook(event);
    res.status(200).send('Webhook received');
  }
}
