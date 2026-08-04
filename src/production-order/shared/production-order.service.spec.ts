import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductionQueueService } from 'src/production/shared/production-queue.service';
import { MeuEnvioShippingStrategy } from 'src/shipping/strategies/meu-envio-shipping.strategy';
import { ProductionOrderService } from './production-order.service';

describe('ProductionOrderService', () => {
  let service: ProductionOrderService;
  let prisma: {
    product: { findFirst: jest.Mock };
    production_capacity: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    production_reservation: {
      deleteMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: {
    $queryRaw: jest.Mock;
    production_capacity: { findUnique: jest.Mock };
    production_reservation: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    order: { create: jest.Mock; update: jest.Mock };
    order_delivery_address: { create: jest.Mock };
    order_service: { create: jest.Mock };
    production: { create: jest.Mock };
  };
  let productionQueueService: {
    getQueueTail: jest.Mock;
    finishDateFor: jest.Mock;
    getActiveCapacity: jest.Mock;
  };
  let meuEnvioShippingStrategy: { calculatePrice: jest.Mock };

  const PRODUCT = { id: 1, uid: 'product-uid' };
  const now = new Date('2026-08-01T00:00:00.000Z');

  beforeEach(async () => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue(undefined),
      production_capacity: { findUnique: jest.fn() },
      production_reservation: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      order: { create: jest.fn(), update: jest.fn() },
      order_delivery_address: { create: jest.fn() },
      order_service: { create: jest.fn() },
      production: { create: jest.fn() },
    };

    prisma = {
      product: { findFirst: jest.fn() },
      production_capacity: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      production_reservation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
    };
    productionQueueService = {
      getQueueTail: jest.fn().mockResolvedValue(now),
      finishDateFor: jest.fn(),
      getActiveCapacity: jest.fn(),
    };
    meuEnvioShippingStrategy = { calculatePrice: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductionQueueService, useValue: productionQueueService },
        {
          provide: MeuEnvioShippingStrategy,
          useValue: meuEnvioShippingStrategy,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderService>(ProductionOrderService);

    prisma.product.findFirst.mockResolvedValue(PRODUCT);
  });

  function mockCandidates() {
    prisma.production_capacity.findMany.mockResolvedValue([
      {
        transformation_workshop_fk: 1,
        product_fk: PRODUCT.id,
        monthly_capacity: 35,
        active: true,
        transformation_workshop: { id: 1, name: 'OT A', cep: '01000000' },
      },
      {
        transformation_workshop_fk: 2,
        product_fk: PRODUCT.id,
        monthly_capacity: 15,
        active: true,
        transformation_workshop: { id: 2, name: 'OT B', cep: '02000000' },
      },
    ]);

    // OT A: frete mais barato e mais rápido em dias úteis
    meuEnvioShippingStrategy.calculatePrice
      .mockResolvedValueOnce({ cost: 18, deliveryTimeDays: 3, service: 'PAC' })
      .mockResolvedValueOnce({ cost: 25, deliveryTimeDays: 3, service: 'PAC' });

    productionQueueService.finishDateFor.mockImplementation(
      (workshopId: number, _productId: number, quantity: number) => {
        const capacity = workshopId === 1 ? 35 : 15;
        const durationDays = (quantity * 30) / capacity;
        return Promise.resolve(
          new Date(now.getTime() + durationDays * 86400000),
        );
      },
    );
  }

  it('retorna unavailable=true quando nenhuma OT tem capacidade ativa', async () => {
    prisma.production_capacity.findMany.mockResolvedValue([]);

    const result = await service.simulate({
      productId: PRODUCT.uid,
      quantity: 30,
      destinationZipCode: '99999000',
    });

    expect(result.unavailable).toBe(true);
    expect(result.costPlan).toBeUndefined();
    expect(result.deadlinePlan).toBeUndefined();
  });

  it('nunca realiza escrita no banco durante simulate()', async () => {
    mockCandidates();

    await service.simulate({
      productId: PRODUCT.uid,
      quantity: 30,
      destinationZipCode: '99999000',
    });

    expect(prisma.production_capacity.create).not.toHaveBeenCalled();
    expect(prisma.production_capacity.update).not.toHaveBeenCalled();
    expect(prisma.production_capacity.delete).not.toHaveBeenCalled();
  });

  it.each([30, 50])(
    'cenário motivador com %d unidades: costPlan concentra na OT mais barata, deadlinePlan pode particionar',
    async (quantity) => {
      mockCandidates();

      const result = await service.simulate({
        productId: PRODUCT.uid,
        quantity,
        destinationZipCode: '99999000',
      });

      expect(result.unavailable).toBeUndefined();
      expect(result.costPlan).toBeDefined();
      expect(result.deadlinePlan).toBeDefined();

      // Modo custo: tudo na OT A (frete mais barato)
      expect(result.costPlan!.shipments).toHaveLength(1);
      expect(result.costPlan!.shipments[0].workshopId).toBe(1);
      expect(result.costPlan!.shipments[0].quantity).toBe(quantity);

      // Soma das quantidades do deadlinePlan bate com o total pedido
      const totalDeadline = result.deadlinePlan!.shipments.reduce(
        (acc, s) => acc + s.quantity,
        0,
      );
      expect(totalDeadline).toBe(quantity);

      // Invariante: o modo prazo nunca entrega depois do modo custo
      expect(result.deadlinePlan!.maxDeliveryAt.getTime()).toBeLessThanOrEqual(
        result.costPlan!.maxDeliveryAt.getTime(),
      );
    },
  );

  it('desempata o modo custo de forma determinística quando o frete é igual (menor índice primeiro)', async () => {
    prisma.production_capacity.findMany.mockResolvedValue([
      {
        transformation_workshop_fk: 1,
        product_fk: PRODUCT.id,
        monthly_capacity: 35,
        active: true,
        transformation_workshop: { id: 1, name: 'OT A', cep: '01000000' },
      },
      {
        transformation_workshop_fk: 2,
        product_fk: PRODUCT.id,
        monthly_capacity: 15,
        active: true,
        transformation_workshop: { id: 2, name: 'OT B', cep: '02000000' },
      },
    ]);
    meuEnvioShippingStrategy.calculatePrice
      .mockResolvedValueOnce({ cost: 20, deliveryTimeDays: 3, service: 'PAC' })
      .mockResolvedValueOnce({ cost: 20, deliveryTimeDays: 3, service: 'PAC' });
    productionQueueService.finishDateFor.mockResolvedValue(now);

    const result = await service.simulate({
      productId: PRODUCT.uid,
      quantity: 10,
      destinationZipCode: '99999000',
    });

    expect(result.costPlan!.shipments[0].workshopId).toBe(1);
  });

  describe('reserve', () => {
    it('reserva uma única fatia, recalculando estimated_ready_at no servidor', async () => {
      tx.production_capacity.findUnique.mockResolvedValue({
        transformation_workshop_fk: 1,
        product_fk: PRODUCT.id,
        monthly_capacity: 35,
        active: true,
      });
      const recalculated = new Date('2026-09-01T00:00:00.000Z');
      productionQueueService.finishDateFor.mockResolvedValue(recalculated);
      tx.production_reservation.create.mockResolvedValue({ id: 101 });

      const result = await service.reserve({
        userId: 1,
        productId: PRODUCT.uid,
        simulationMode: 'COST',
        shipments: [{ workshopId: 1, quantity: 30 }],
      });

      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0]).toMatchObject({
        workshopId: 1,
        quantity: 30,
        productionReservationId: 101,
        estimatedReadyAt: recalculated,
      });
      // estimated_ready_at nunca é aceito do payload — sempre vem de finishDateFor
      expect(productionQueueService.finishDateFor).toHaveBeenCalledWith(
        1,
        PRODUCT.id,
        30,
        tx,
      );
    });

    it('reserva múltiplas fatias em ordem determinística por workshopId', async () => {
      tx.production_capacity.findUnique.mockResolvedValue({
        transformation_workshop_fk: 1,
        product_fk: PRODUCT.id,
        monthly_capacity: 35,
        active: true,
      });
      productionQueueService.finishDateFor.mockResolvedValue(now);
      tx.production_reservation.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });

      const result = await service.reserve({
        userId: 1,
        productId: PRODUCT.uid,
        simulationMode: 'DEADLINE',
        shipments: [
          { workshopId: 2, quantity: 9 },
          { workshopId: 1, quantity: 21 },
        ],
      });

      expect(result.reservations).toHaveLength(2);
      // Ordenado por workshopId asc, independente da ordem recebida no payload
      expect(result.reservations[0].workshopId).toBe(1);
      expect(result.reservations[1].workshopId).toBe(2);
    });

    it('aborta a transação inteira (sem reserva parcial) quando a capacidade foi desativada', async () => {
      tx.production_capacity.findUnique.mockResolvedValue({
        transformation_workshop_fk: 1,
        product_fk: PRODUCT.id,
        monthly_capacity: 35,
        active: false,
      });

      await expect(
        service.reserve({
          userId: 1,
          productId: PRODUCT.uid,
          simulationMode: 'COST',
          shipments: [{ workshopId: 1, quantity: 30 }],
        }),
      ).rejects.toThrow(HttpException);

      expect(tx.production_reservation.create).not.toHaveBeenCalled();
    });

    it('limpa reservas pendentes do mesmo usuário antes de criar as novas', async () => {
      tx.production_capacity.findUnique.mockResolvedValue({
        transformation_workshop_fk: 1,
        product_fk: PRODUCT.id,
        monthly_capacity: 35,
        active: true,
      });
      productionQueueService.finishDateFor.mockResolvedValue(now);
      tx.production_reservation.create.mockResolvedValue({ id: 1 });

      await service.reserve({
        userId: 42,
        productId: PRODUCT.uid,
        simulationMode: 'COST',
        shipments: [{ workshopId: 1, quantity: 30 }],
      });

      expect(tx.production_reservation.deleteMany).toHaveBeenCalledWith({
        where: { user_fk: 42, order_fk: null },
      });
    });

    it('trava a linha de production_capacity (FOR UPDATE) antes de ler a capacidade', async () => {
      tx.production_capacity.findUnique.mockResolvedValue({
        transformation_workshop_fk: 1,
        product_fk: PRODUCT.id,
        monthly_capacity: 35,
        active: true,
      });
      productionQueueService.finishDateFor.mockResolvedValue(now);
      tx.production_reservation.create.mockResolvedValue({ id: 1 });

      await service.reserve({
        userId: 1,
        productId: PRODUCT.uid,
        simulationMode: 'COST',
        shipments: [{ workshopId: 1, quantity: 30 }],
      });

      expect(tx.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const RESERVATION_A = {
      id: 501,
      transformation_workshop_fk: 1,
      product_fk: PRODUCT.id,
      quantity: 21,
      estimated_ready_at: new Date('2026-08-20T00:00:00.000Z'),
    };
    const RESERVATION_B = {
      id: 502,
      transformation_workshop_fk: 2,
      product_fk: PRODUCT.id,
      quantity: 9,
      estimated_ready_at: new Date('2026-08-21T00:00:00.000Z'),
    };

    beforeEach(() => {
      prisma.product.findFirst.mockResolvedValue({ ...PRODUCT, price: 100 });
      tx.order.create.mockResolvedValue({ id: 1, uid: 'ZR-202608-ABCDEF12' });
      tx.order_service.create.mockImplementation(
        (args: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: Math.random(),
            ...args.data,
            order_item: [{ id: Math.random() }],
          }),
      );
      tx.production.create.mockResolvedValue({ id: 1 });
      tx.order.update.mockResolvedValue({});
      tx.production_reservation.updateMany.mockResolvedValue({ count: 1 });
    });

    it('cria o pedido de encomenda com 1 OT', async () => {
      tx.production_reservation.findFirst.mockResolvedValue(RESERVATION_A);

      const order = await service.create({
        userId: 1,
        productId: PRODUCT.uid,
        simulationMode: 'DEADLINE',
        shipments: [{ workshopId: 1, quantity: 21 }],
      });

      expect(order).toBeDefined();
      const [orderCreateArgs] = tx.order.create.mock.calls[0] as [
        { data: { sale_type: string } },
      ];
      expect(orderCreateArgs.data.sale_type).toBe('ENCOMENDA');
      expect(tx.order_service.create).toHaveBeenCalledTimes(1);
      expect(tx.production.create).toHaveBeenCalledTimes(1);
      const [productionCreateArgs] = tx.production.create.mock.calls[0] as [
        { data: { production_status: string; date_end: Date } },
      ];
      expect(productionCreateArgs.data.production_status).toBe('QUEUED');
      expect(productionCreateArgs.data.date_end).toBe(
        RESERVATION_A.estimated_ready_at,
      );
      expect(tx.production_reservation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [RESERVATION_A.id] } },
        data: { order_fk: 1 },
      });
    });

    it('cria um order_service por OT quando há 2+ fatias (modo prazo particionado)', async () => {
      tx.production_reservation.findFirst
        .mockResolvedValueOnce(RESERVATION_A)
        .mockResolvedValueOnce(RESERVATION_B);

      await service.create({
        userId: 1,
        productId: PRODUCT.uid,
        simulationMode: 'DEADLINE',
        shipments: [
          { workshopId: 1, quantity: 21 },
          { workshopId: 2, quantity: 9 },
        ],
      });

      expect(tx.order_service.create).toHaveBeenCalledTimes(2);
      expect(tx.production.create).toHaveBeenCalledTimes(2);
    });

    it('falha com HTTP 400 e sem registro parcial quando a reserva não existe ou expirou', async () => {
      tx.production_reservation.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          userId: 1,
          productId: PRODUCT.uid,
          simulationMode: 'COST',
          shipments: [{ workshopId: 1, quantity: 30 }],
        }),
      ).rejects.toThrow(HttpException);

      expect(tx.order.create).not.toHaveBeenCalled();
      expect(tx.order_service.create).not.toHaveBeenCalled();
      expect(tx.production.create).not.toHaveBeenCalled();
    });
  });
});
