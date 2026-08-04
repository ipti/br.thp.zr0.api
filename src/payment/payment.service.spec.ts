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

  beforeEach(async () => {
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      transformation_workshop_user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      order_service: { update: jest.fn() },
    };
    emailService = { sendEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: StripeService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
  });
});
