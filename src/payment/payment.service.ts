import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { EmailService } from '../utils/middleware/email.middleware';

@Injectable()
export class PaymentService {
  constructor(private readonly stripeService: StripeService, private readonly prisma: PrismaService, private readonly emailService: EmailService,) { }

  async createPaymentIntent(amount: number, currency: string, idOrder: number) {
    const stripe = this.stripeService.getStripeClient();
    const payment = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    },
      //  { idempotencyKey: idOrder.toString() } 
    );

    const order = await this.prisma.order.findUnique({
      where: {
        id: idOrder
      },

    })

    if (order) {
      await this.prisma.order.update({ where: { id: idOrder }, data: { payment_intent_id: payment?.id } })
    }

    return payment
  }

  async refundPaymentIntent(amount: number, idOrder: number) {

    const order = await this.prisma.order.findUnique({
      where: {
        id: idOrder
      },
    })

    if (!order?.payment_intent_id) {
      throw new HttpException('Payment intent not found', HttpStatus.NOT_FOUND);
    }

    const stripe = this.stripeService.getStripeClient();
    const payment = await stripe.refunds.create({
      amount: Math.round(amount * 100),
      payment_intent: order?.payment_intent_id
    });

    if (order) {
      await this.prisma.order.update({ where: { id: idOrder }, data: { status: 'CANCELLED', payment_status: 'REFUNDED'}, })
    }

    return payment
  }

  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
          this.updateOrderStatus(paymentIntent.id, 'PAID');
          break;

        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          this.updateOrderStatus(failedIntent.id, 'FAILED');
          console.warn('❌ Payment failed:', failedIntent.id);
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }

  }

  async updateOrderStatus(idPaymentIntent: string, status: string) {

    try {
      const order = await this.prisma.order.findUnique({
        where: { payment_intent_id: idPaymentIntent }, include: {
          order_delivery_address: { include: { city: true, state: true } },
          order_items: {
            include: {
              product: {
                include: {
                  product_image: true
                }
              }
            }
          },
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      })

      if (!order) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      } else {

        const workshopUsersManagers = await this.prisma.transformation_workshop_user.findMany({
          where: {
            transformation_workshop_fk: order.workshop_fk ?? 1,
            users: { role: { in: ['SELLER', 'SELLER_MANAGER'] }, }
          },
          select: {
            users: {
              select: { email: true }
            }
          }
        });

        await this.prisma.order.update({ where: { id: order.id }, data: { payment_status: status === 'PAID' ? 'PAID' : status === 'FAILED' ? 'FAILED' : order.payment_status, status: status === 'PAID' ? 'CONFIRMED' : order.status } })
        if (status === 'PAID') {
          await this.emailService.sendEmail(
            order.user?.email ?? '',
            'Pagamento realizado',
            'paymentConfirmed.hbs',
            {
              name_client: order.user?.name,
              id_order: order.uid,
              total_amount: order.total_amount,
              payment_method: order.payment_method,
              address: order.order_delivery_address?.address,
              number: order.order_delivery_address?.number,
              neighborhood: order.order_delivery_address?.neighborhood,
              cep: order.order_delivery_address?.cep,
              state: order.order_delivery_address?.state?.name,
              city: order.order_delivery_address?.city?.name,
              products: order.order_items.map((i) => ({
                id: i.product.uid,
                name: i.product.name,
                quantity: i.quantity,
                price: i.total_price,
                imagem: i.product.product_image[0]?.img_url ?? '',
              })),
            },
          );
          for (const manager of workshopUsersManagers) {
            await this.emailService.sendEmail(
              manager.users?.email ?? '',
              'Pagamento realizado',
              'paymentConfirmedManager.hbs',
              {
                name_client: order.user?.name,
                id_order: order.uid,
                total_amount: order.total_amount,
                payment_method: order.payment_method,
                address: order.order_delivery_address?.address,
                number: order.order_delivery_address?.number,
                neighborhood: order.order_delivery_address?.neighborhood,
                cep: order.order_delivery_address?.cep,
                state: order.order_delivery_address?.state?.name,
                city: order.order_delivery_address?.city?.name,
                products: order.order_items.map((i) => ({
                  id: i.product.uid,
                  name: i.product.name,
                  quantity: i.quantity,
                  price: i.total_price,
                  imagem: i.product.product_image[0]?.img_url ?? '',
                })),
              },
            );
          }
        }

      }

      console.log('email enviado')

      return { message: 'Pagamento realizado' }
    } catch (err) {
      return new HttpException(err, HttpStatus.BAD_REQUEST);
      // throw 
    }
  }


  async getPaymentIntent(idOrder: number) {
    try {

      const order = await this.prisma.order.findUnique({ where: { id: idOrder } })

      if (!order) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      }

      if (order?.payment_intent_id) {
        const stripe = this.stripeService.getStripeClient();

        const paymentIntent = await stripe.paymentIntents.retrieve(
          order.payment_intent_id
        );
        return paymentIntent
      } else {
        return await this.createPaymentIntent(order?.total_amount ?? 0, 'BRL', order?.id)
      }

    } catch (error) {
      console.log(error)
      return new HttpException(error, HttpStatus.BAD_REQUEST);
    }
  }
}