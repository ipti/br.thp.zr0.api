import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { ShippingService } from '../shipping/shipping.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: {
    product: { findMany: jest.Mock };
    stock_reservation: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    $queryRaw: jest.Mock;
    stock_reservation: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      aggregate: jest.Mock;
    };
    inventory: { findUnique: jest.Mock };
  };

  const PRODUCT = { id: 1, uid: 'product-uid' };

  beforeEach(async () => {
    const callOrder: string[] = [];
    tx = {
      $queryRaw: jest.fn().mockImplementation(() => {
        callOrder.push('lock');
        return Promise.resolve(undefined);
      }),
      stock_reservation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
      },
      inventory: {
        findUnique: jest.fn().mockImplementation(() => {
          callOrder.push('read');
          return Promise.resolve({ quantity: 20 });
        }),
      },
    };
    (tx as unknown as { __callOrder: string[] }).__callOrder = callOrder;

    prisma = {
      product: { findMany: jest.fn().mockResolvedValue([PRODUCT]) },
      stock_reservation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: ShippingService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveStock', () => {
    it('libera reservas expiradas antes de tentar reservar', async () => {
      await service.reserveStock({
        userId: 1,
        items: [{ productId: PRODUCT.uid, workshopId: 1, quantity: 5 }],
      } as never);

      expect(prisma.stock_reservation.deleteMany).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { expires_at: { lte: expect.any(Date) }, order_fk: null },
      });
    });

    it('trava a linha de inventory (FOR UPDATE) antes de ler a disponibilidade', async () => {
      await service.reserveStock({
        userId: 1,
        items: [{ productId: PRODUCT.uid, workshopId: 1, quantity: 5 }],
      } as never);

      const callOrder = (tx as unknown as { __callOrder: string[] })
        .__callOrder;
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(callOrder).toEqual(['lock', 'read']);
    });

    it('rejeita a reserva quando o estoque disponível é insuficiente', async () => {
      tx.inventory.findUnique.mockResolvedValue({ quantity: 3 });

      await expect(
        service.reserveStock({
          userId: 1,
          items: [{ productId: PRODUCT.uid, workshopId: 1, quantity: 5 }],
        } as never),
      ).rejects.toThrow(HttpException);

      expect(tx.stock_reservation.create).not.toHaveBeenCalled();
    });

    it('rejeita a reserva sem nenhum fallback automático para produção', async () => {
      tx.inventory.findUnique.mockResolvedValue({ quantity: 3 });

      await expect(
        service.reserveStock({
          userId: 1,
          items: [{ productId: PRODUCT.uid, workshopId: 1, quantity: 5 }],
        } as never),
      ).rejects.toThrow(/Insufficient stock/);
    });

    it('considera reservas ativas de outros usuários ao calcular disponibilidade', async () => {
      tx.inventory.findUnique.mockResolvedValue({ quantity: 20 });
      tx.stock_reservation.aggregate.mockResolvedValue({
        _sum: { quantity: 18 },
      });

      await expect(
        service.reserveStock({
          userId: 1,
          items: [{ productId: PRODUCT.uid, workshopId: 1, quantity: 5 }],
        } as never),
      ).rejects.toThrow(HttpException);
    });

    it('cria a reserva quando há estoque disponível suficiente', async () => {
      const result = await service.reserveStock({
        userId: 1,
        items: [{ productId: PRODUCT.uid, workshopId: 1, quantity: 5 }],
      } as never);

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(tx.stock_reservation.create).toHaveBeenCalledWith({
        data: {
          product: { connect: { id: PRODUCT.id } },
          transformation_workshop: { connect: { id: 1 } },
          user: { connect: { id: 1 } },
          quantity: 5,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expires_at: expect.any(Date),
        },
      });
    });
  });

  describe('releaseExpiredReservations', () => {
    it('remove apenas reservas expiradas e sem pedido vinculado', async () => {
      prisma.stock_reservation.deleteMany.mockResolvedValue({ count: 4 });

      const result = await service.releaseExpiredReservations();

      expect(result).toEqual({ released: 4 });
      expect(prisma.stock_reservation.deleteMany).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { expires_at: { lte: expect.any(Date) }, order_fk: null },
      });
    });
  });
});
