import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../utils/middleware/email.middleware';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: {
    order: { findUnique: jest.Mock; update: jest.Mock };
    transformation_workshop_user: { findMany: jest.Mock };
    order_service: { update: jest.Mock };
  };
  let emailService: { sendEmail: jest.Mock };
  let stripe: {
    paymentIntents: { create: jest.Mock; retrieve: jest.Mock };
    refunds: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      transformation_workshop_user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      order_service: { update: jest.fn() },
    };
    emailService = { sendEmail: jest.fn() };
    stripe = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({ id: 'pi_1' }),
        retrieve: jest.fn(),
      },
      refunds: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: StripeService,
          useValue: { getStripeClient: () => stripe },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntentForOrder', () => {
    it('calcula o valor em centavos no servidor e usa idempotência', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 12,
        uid: 'ZR-12',
        user_fk: 7,
        total_amount: 200,
        payment_method: 'PIX',
        payment_status: 'PENDING',
        payment_intent_id: null,
      });
      prisma.order.update.mockResolvedValue({});

      await service.createPaymentIntentForOrder(12);

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 20000, currency: 'brl' }),
        { idempotencyKey: 'order-12-payment-v1' },
      );
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 12 },
        data: { payment_intent_id: 'pi_1' },
      });
    });

    it('reutiliza o PaymentIntent já associado ao pedido', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 12,
        uid: 'ZR-12',
        user_fk: 7,
        total_amount: 200,
        payment_method: 'PIX',
        payment_status: 'PENDING',
        payment_intent_id: 'pi_existing',
      });
      stripe.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_existing' });

      await service.createPaymentIntentForOrder(12);

      expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_existing');
      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentIntent', () => {
    it('impede que um cliente acesse o pagamento de outro usuário', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 12, user_fk: 99 });

      await expect(
        service.getPaymentIntent(12, 7, 'CUSTOMER'),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('updateOrderStatus', () => {
    function mockOrder(saleType: 'PRONTA_ENTREGA' | 'ENCOMENDA') {
      prisma.order.findUnique.mockResolvedValue({
        id: 1,
        uid: 'ZR-1',
        sale_type: saleType,
        payment_status: 'PENDING',
        user: { email: 'a@a.com', name: 'A' },
        order_delivery_address: null,
        order_services: [
          {
            id: 10,
            transformation_workshop_fk: 1,
            order_item: [
              {
                product: { uid: 'p', name: 'P', product_image: [] },
                quantity: 1,
                total_price: 10,
              },
            ],
          },
        ],
      });
      prisma.order.update.mockResolvedValue({});
      prisma.order_service.update.mockResolvedValue({});
    }

    it('move order_service para IN_PRODUCTION quando o pedido é de Encomenda', async () => {
      mockOrder('ENCOMENDA');

      await service.updateOrderStatus('pi_1', 'PAID');

      expect(prisma.order_service.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'IN_PRODUCTION' },
      });
    });

    it('move order_service para CONFIRMED quando o pedido é de Pronta Entrega (regressão)', async () => {
      mockOrder('PRONTA_ENTREGA');

      await service.updateOrderStatus('pi_1', 'PAID');

      expect(prisma.order_service.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'CONFIRMED' },
      });
    });

    it('não reprocessa e-mail para evento duplicado', async () => {
      mockOrder('PRONTA_ENTREGA');
      const existingOrder = await prisma.order.findUnique();
      prisma.order.findUnique.mockResolvedValue({
        ...existingOrder,
        payment_status: 'PAID',
        order_services: existingOrder.order_services.map((service) => ({
          ...service,
          status: 'CONFIRMED',
        })),
      });

      await service.updateOrderStatus('pi_1', 'PAID');

      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });
});
