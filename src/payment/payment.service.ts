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
      include: {
        user: {
          select: {email: true, name: true}
        },
        order_delivery_address: {
          include: {
            city: true,
            state: true
          }
        },
        order_services: {
          include: {
            order_item: {
              include: {
                product: {
                  include: {
                    product_image: true
                  }
                }
              }
            }
          }
        }
      }
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
      await this.prisma.order.update({ where: { id: idOrder }, data: { payment_status: 'REFUNDED'}, })
    }

    const products = order.order_services.flatMap((service) =>
      service.order_item.map((i) => ({
        id: i.product.uid,
        name: i.product.name,
        quantity: i.quantity,
        price: i.total_price,
        imagem: i.product?.product_image[0]?.img_url ?? '',
      }))
    );

    await this.emailService.sendEmail(
          order.user?.email ?? '',
          'Reembolsar pedido',
          'refundOrder.hbs',
          {
            name_client: order.user?.name,
            id_order: order.uid,
            total_amount: order.total_amount,
            products,
          },
        );
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
        where: { payment_intent_id: idPaymentIntent }, 
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          },
          order_delivery_address: { 
            include: { city: true, state: true } 
          },
          order_services: {
            include: {
              transformation_workshop: true,
              order_item: {
                include: {
                  product: {
                    include: {
                      product_image: true
                    }
                  }
                }
              }
            }
          },
        }
      })

      if (!order) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      } else {

        const workshopIds = order.order_services.map(os => os.transformation_workshop_fk).filter(Boolean) as number[];

        const workshopUsersManagers = await this.prisma.transformation_workshop_user.findMany({
          where: {
            transformation_workshop_fk: { in: workshopIds },
            users: { role: { in: ['SELLER', 'SELLER_MANAGER'] }, }
          },
          select: {
            users: {
              select: { email: true }
            }
          }
        });

        await this.prisma.order.update({ 
          where: { id: order.id }, 
          data: { 
            payment_status: status === 'PAID' ? 'PAID' : status === 'FAILED' ? 'FAILED' : order.payment_status,
          } 
        });

        // Atualizar status dos order_services se o pagamento foi confirmado
        if (status === 'PAID') {
          for (const orderService of order.order_services) {
            await this.prisma.order_service.update({
              where: { id: orderService.id },
              data: { status: 'CONFIRMED' }
            });
          }
        }

        const products = order.order_services.flatMap((service) =>
          service.order_item.map((i) => ({
            id: i.product.uid,
            name: i.product.name,
            quantity: i.quantity,
            price: i.total_price,
            imagem: i.product.product_image[0]?.img_url ?? '',
          }))
        );

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
              products,
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
                products,
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