import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/utils/middleware/email.middleware';
import { PaymentService } from 'src/payment/payment.service';
import { CouponService } from 'src/coupon/coupon.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    product: { findMany: jest.Mock };
    inventory: { findMany: jest.Mock };
    stock_reservation: { findMany: jest.Mock };
    transformation_workshop_user: { findMany: jest.Mock };
    users: { findUnique: jest.Mock };
    cart: { findFirst: jest.Mock };
    cartItem: { deleteMany: jest.Mock };
    order: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    order: { create: jest.Mock; update: jest.Mock };
    order_service: { create: jest.Mock };
    inventory: { update: jest.Mock };
    inventory_exit: { create: jest.Mock };
    order_delivery_address: { create: jest.Mock };
    stock_reservation: { updateMany: jest.Mock };
    coupon: { update: jest.Mock };
  };
  let emailService: { sendEmail: jest.Mock };
  let paymentService: { createPaymentIntent: jest.Mock };
  let couponService: { validateCoupon: jest.Mock };

  const PRODUCT = {
    id: 1,
    uid: 'product-uid',
    name: 'Cadeira',
    price: 100,
    product_image: [],
  };

  beforeEach(async () => {
    tx = {
      order: {
        create: jest.fn().mockResolvedValue({ id: 1, uid: 'ZR-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      order_service: {
        create: jest.fn().mockImplementation((args: { data: unknown }) =>
          Promise.resolve({
            ...(args.data as Record<string, unknown>),
            order_item: [{}],
          }),
        ),
      },
      inventory: { update: jest.fn().mockResolvedValue({}) },
      inventory_exit: { create: jest.fn().mockResolvedValue({}) },
      order_delivery_address: { create: jest.fn().mockResolvedValue({}) },
      stock_reservation: { updateMany: jest.fn().mockResolvedValue({}) },
      coupon: { update: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      product: { findMany: jest.fn().mockResolvedValue([PRODUCT]) },
      inventory: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { transformation_workshop_fk: 1, product_fk: 1, quantity: 50 },
          ]),
      },
      stock_reservation: { findMany: jest.fn().mockResolvedValue([]) },
      transformation_workshop_user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      users: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ email: 'a@a.com', name: 'A' }),
      },
      cart: { findFirst: jest.fn().mockResolvedValue(null) },
      cartItem: { deleteMany: jest.fn().mockResolvedValue({}) },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          uid: 'ZR-1',
          total_amount: 100,
          payment_method: 'PIX',
          order_delivery_address: null,
          order_services: [
            {
              order_item: [
                {
                  product: PRODUCT,
                  quantity: 1,
                  total_price: 100,
                  delivery_estimate: { cost: 0 },
                },
              ],
            },
          ],
        }),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
    };

    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    paymentService = {
      createPaymentIntent: jest.fn().mockResolvedValue({}),
    };
    couponService = { validateCoupon: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: PaymentService, useValue: paymentService },
        { provide: CouponService, useValue: couponService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (Pronta Entrega)', () => {
    const baseDto = {
      userId: 1,
      items: [
        {
          productId: PRODUCT.uid,
          workshopId: 1,
          quantity: 2,
          delivery_estimate: { cost: 10 },
        },
      ],
    };

    it('cria um único order_service por OT, sem agrupar por saleType', async () => {
      await service.create(baseDto as never);

      expect(tx.order_service.create).toHaveBeenCalledTimes(1);
      const [args] = tx.order_service.create.mock.calls[0] as [
        { data: { transformation_workshop: { connect: { id: number } } } },
      ];
      expect(args.data.transformation_workshop.connect.id).toBe(1);
    });

    it('agrupa múltiplos itens do mesmo workshop em um único order_service', async () => {
      await service.create({
        userId: 1,
        items: [
          {
            productId: PRODUCT.uid,
            workshopId: 1,
            quantity: 1,
            delivery_estimate: { cost: 0 },
          },
          {
            productId: PRODUCT.uid,
            workshopId: 1,
            quantity: 1,
            delivery_estimate: { cost: 0 },
          },
        ],
      } as never);

      expect(tx.order_service.create).toHaveBeenCalledTimes(1);
    });

    it('rejeita o pedido quando o estoque agregado é insuficiente, sem fallback para produção', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        { transformation_workshop_fk: 1, product_fk: 1, quantity: 1 },
      ]);

      await expect(service.create(baseDto as never)).rejects.toThrow(
        HttpException,
      );
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('debita o inventory (fonte única de estoque) ao confirmar o pedido', async () => {
      await service.create(baseDto as never);

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk: 1,
            product_fk: PRODUCT.id,
          },
        },
        data: { quantity: { decrement: 2 } },
      });
    });

    it('não recebe nem processa nenhum campo de simulação de encomenda no DTO', async () => {
      const dtoWithStrayEncomendaFields = {
        ...baseDto,
        simulationMode: 'DEADLINE',
        productionCapacity: 999,
      };

      await service.create(dtoWithStrayEncomendaFields as never);

      const [args] = tx.order.create.mock.calls[0] as [{ data: object }];
      expect(args.data).not.toHaveProperty('simulation_mode');
      expect(args.data).not.toHaveProperty('sale_type');
    });
  });
});
