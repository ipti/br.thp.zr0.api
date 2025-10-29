import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  constructor(private readonly stripeService: StripeService, private readonly prisma: PrismaService,) { }

  async createPaymentIntent(amount: number, currency: string, idOrder: number) {
    const stripe = this.stripeService.getStripeClient();
    const payment = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    }, { idempotencyKey: idOrder.toString() } );

    const order = await this.prisma.order.findUnique({
      where: {
        id: idOrder
      }
    })

    if (order) {
      await this.prisma.order.update({ where: { id: idOrder }, data: {payment_intent_id: payment?.id} })
    }

    return payment
  }

  async handleWebhook(event) {
    try{
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
          this.updateOrderStatus(paymentIntent.id, 'PAID')
          break;

        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          this.updateOrderStatus(failedIntent.id, 'FAILED')
          console.warn('❌ Payment failed:', failedIntent.id);
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }

  }

  async updateOrderStatus(idPaymentIntent: string, status: string){
    try {
      const order = await this.prisma.order.findUnique({where: {payment_intent_id: idPaymentIntent}})

      if(!order) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      }else { 
        await this.prisma.order.update({where: {id: order.id}, data: {payment_status: status === 'PAID' ? 'PAID' : status === 'FAILED' ? 'FAILED' : order.payment_status, status: status === 'PAID' ? 'CONFIRMED' : order.status}})
      }

      return {message: 'Pagamento realizado'}
    } catch (err) {
      return new HttpException(err, HttpStatus.BAD_REQUEST);
      // throw 
    }
  }
}