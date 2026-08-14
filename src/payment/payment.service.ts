import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { EmailService } from '../utils/middleware/email.middleware';

@Injectable()
export class PaymentService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private assertCanAccessOrder(
    order: { user_fk: number },
    requesterId?: number,
    requesterRole?: string,
  ) {
    if (
      requesterId !== undefined &&
      order.user_fk !== requesterId &&
      requesterRole !== 'ADMIN'
    ) {
      throw new ForbiddenException('Você não pode acessar o pagamento deste pedido');
    }
  }

  async createPaymentIntentForOrder(idOrder: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: idOrder },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.payment_status === 'PAID') {
      throw new ConflictException('Este pedido já foi pago');
    }

    if (order.payment_status === 'REFUNDED') {
      throw new ConflictException('Este pedido já foi reembolsado');
    }

    const stripe = this.stripeService.getStripeClient();
    if (order.payment_intent_id) {
      return stripe.paymentIntents.retrieve(order.payment_intent_id);
    }

    const amountInCents = Math.round(order.total_amount * 100);
    if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
      throw new BadRequestException('O pedido possui um valor inválido para pagamento');
    }

    const normalizedMethod: PaymentMethod = order.payment_method ?? 'PIX';
    const paymentMethodTypes: string[] =
      normalizedMethod === 'PIX'
        ? ['pix']
        : normalizedMethod === 'BANK_SLIP'
          ? ['boleto']
          : ['card'];
    const payment = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: 'brl',
        payment_method_types: paymentMethodTypes,
        payment_method_options:
          normalizedMethod === 'PIX'
            ? { pix: { expires_after_seconds: 3600 } }
            : normalizedMethod === 'BANK_SLIP'
              ? { boleto: { expires_after_days: 3 } }
              : { card: { installments: { enabled: true } } },
        metadata: {
          order_id: String(order.id),
          order_uid: order.uid,
        },
      } as any,
      { idempotencyKey: `order-${order.id}-payment-v1` },
    );

    await this.prisma.order.update({
      where: { id: idOrder },
      data: { payment_intent_id: payment.id },
    });

    return payment;
  }

  async refundPaymentIntent(idOrder: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: idOrder,
      },
      include: {
        user: {
          select: { email: true, name: true },
        },
        order_delivery_address: {
          include: {
            city: true,
            state: true,
          },
        },
        order_services: {
          include: {
            order_item: {
              include: {
                product: {
                  include: {
                    product_image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order?.payment_intent_id) {
      throw new HttpException('Payment intent not found', HttpStatus.NOT_FOUND);
    }

    if (order.payment_status !== 'PAID') {
      throw new ConflictException('Somente pedidos pagos podem ser reembolsados');
    }

    const stripe = this.stripeService.getStripeClient();
    const payment = await stripe.refunds.create(
      { payment_intent: order.payment_intent_id },
      { idempotencyKey: `order-${order.id}-full-refund-v1` },
    );

    await this.prisma.order.update({
      where: { id: order.id },
      data: { payment_status: 'REFUNDED' },
    });

    if (order) {
      const orders_services = await this.prisma.order_service.findMany({
        where: {
          order_fk: order.id,
        },
      });

      for (const os of orders_services) {
        await this.prisma.order_service.update({
          where: {
            id: os.id,
          },
          data: {
            status: 'CANCELLED',
          },
        });
      }
    }

    const products = order.order_services.flatMap((service) =>
      service.order_item.map((i) => ({
        id: i.product.uid,
        name: i.product.name,
        quantity: i.quantity,
        price: i.total_price,
        imagem: i.product?.product_image[0]?.img_url ?? '',
      })),
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
    return payment;
  }

  async handleWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
          await this.updateOrderStatus(paymentIntent.id, 'PAID');
          break;

        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          await this.updateOrderStatus(failedIntent.id, 'FAILED');
          console.warn('❌ Payment failed:', failedIntent.id);
          break;

        case 'charge.refund.updated':
          const refundIntent = event.data.object as Stripe.Refund;
          await this.updateOrderStatus(
            refundIntent.payment_intent?.toString() ?? '',
            'REFUNDED',
          );
          console.warn('❌ Payment refund:', refundIntent.payment_intent);
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      throw err;
    }
  }

  async updateOrderStatus(idPaymentIntent: string, status: PaymentStatus) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { payment_intent_id: idPaymentIntent },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          order_delivery_address: {
            include: { city: true, state: true },
          },
          order_services: {
            include: {
              transformation_workshop: true,
              order_item: {
                include: {
                  product: {
                    include: {
                      product_image: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      } else {
        const isDuplicateEvent = order.payment_status === status;
        if (isDuplicateEvent && status !== 'PAID') {
          return { message: 'Evento de pagamento já processado' };
        }

        const workshopIds = order.order_services
          .map((os) => os.transformation_workshop_fk)
          .filter(Boolean) as number[];

        const workshopUsersManagers =
          await this.prisma.transformation_workshop_user.findMany({
            where: {
              transformation_workshop_fk: { in: workshopIds },
              users: { role: { in: ['SELLER', 'SELLER_MANAGER'] } },
            },
            select: {
              users: {
                select: { email: true },
              },
            },
          });

        if (!isDuplicateEvent) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: { payment_status: status },
          });
        }

        console.log('Status do pedido atualizado para:', status);

        // Atualizar status dos order_services se o pagamento foi confirmado.
        // Pedidos de Encomenda (order.sale_type = 'ENCOMENDA') vão para
        // IN_PRODUCTION em vez de CONFIRMED — o pedido inteiro é homogêneo,
        // então basta ramificar por order.sale_type, não por order_service.
        if (status === 'PAID') {
          const orderServiceStatus =
            order.sale_type === 'ENCOMENDA' ? 'IN_PRODUCTION' : 'CONFIRMED';
          const servicesWereAlreadyUpdated = order.order_services.every(
            (orderService) => orderService.status === orderServiceStatus,
          );
          for (const orderService of order.order_services) {
            await this.prisma.order_service.update({
              where: { id: orderService.id },
              data: { status: orderServiceStatus },
            });
          }

          if (isDuplicateEvent && servicesWereAlreadyUpdated) {
            return { message: 'Evento de pagamento já processado' };
          }
        }

        const products = order.order_services.flatMap((service) =>
          service.order_item.map((i) => ({
            id: i.product.uid,
            name: i.product.name,
            quantity: i.quantity,
            price: i.total_price,
            imagem: i.product.product_image[0]?.img_url ?? '',
          })),
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

      console.log('email enviado');

      return { message: 'Pagamento realizado' };
    } catch (err) {
      throw err;
    }
  }

  async getPaymentIntent(
    idOrder: number,
    requesterId?: number,
    requesterRole?: string,
  ) {
    if (!Number.isInteger(idOrder) || idOrder <= 0) {
      throw new BadRequestException('Pedido inválido');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: idOrder },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    this.assertCanAccessOrder(order, requesterId, requesterRole);
    return this.createPaymentIntentForOrder(order.id);
  }
}
