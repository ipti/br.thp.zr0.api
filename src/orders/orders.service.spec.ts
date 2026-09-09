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
    order: { findUnique: jest.Mock; update: jest.Mock };
    order_service: { findMany: jest.Mock; update: jest.Mock };
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
  let paymentService: { createPaymentIntentForOrder: jest.Mock };
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
          user_fk: 1,
          total_amount: 100,
          payment_method: 'PIX',
          payment_status: 'PENDING',
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
        update: jest.fn().mockResolvedValue({}),
      },
      order_service: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
    };

    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    paymentService = {
      createPaymentIntentForOrder: jest.fn().mockResolvedValue({}),
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

  describe('findOne', () => {
    it('inclui as imagens dos produtos nos detalhes do pedido', async () => {
      await service.findOne(1, 1, 'USER');

      expect(prisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            order_services: {
              include: expect.objectContaining({
                order_item: {
                  include: {
                    product: {
                      include: { product_image: true },
                    },
                    variant: true,
                  },
                },
              }),
            },
          }),
        }),
      );
    });
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

    it('mantém o pedido criado quando a preparação do pagamento falha', async () => {
      paymentService.createPaymentIntentForOrder.mockRejectedValueOnce(
        new Error('Stripe indisponível'),
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.create(baseDto as never)).resolves.toMatchObject({
        orders: [{ id: 1 }],
      });

      consoleSpy.mockRestore();
    });
  });

  describe('update (alterar forma de pagamento)', () => {
    it('atualiza payment_method e zera payment_intent_id quando o pedido está pendente', async () => {
      await service.update(1, { payment_method: 'BANK_SLIP' } as never, 1, 'CUSTOMER');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            payment_method: 'BANK_SLIP',
            payment_intent_id: null,
          }),
        }),
      );
    });

    it('rejeita a troca de forma de pagamento se o pedido já não está pendente/falho', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 1,
        user_fk: 1,
        payment_status: 'PAID',
        order_services: [],
      });

      await expect(
        service.update(1, { payment_method: 'BANK_SLIP' } as never, 1, 'CUSTOMER'),
      ).rejects.toThrow(HttpException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejeita a troca de forma de pagamento de um pedido de outro usuário', async () => {
      await expect(
        service.update(1, { payment_method: 'BANK_SLIP' } as never, 999, 'CUSTOMER'),
      ).rejects.toThrow(HttpException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('permite que um ADMIN altere a forma de pagamento de qualquer pedido', async () => {
      await service.update(1, { payment_method: 'CREDIT_CARD' } as never, 999, 'ADMIN');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ payment_method: 'CREDIT_CARD' }),
        }),
      );
    });
  });
});
