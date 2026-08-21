import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ProductionCapacityUnavailableError,
  ProductionQueueService,
} from './production-queue.service';

describe('ProductionQueueService', () => {
  let service: ProductionQueueService;
  let prisma: {
    production: { findMany: jest.Mock };
    production_reservation: { aggregate: jest.Mock };
    production_capacity: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      production: { findMany: jest.fn() },
      production_reservation: { aggregate: jest.fn() },
      production_capacity: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionQueueService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductionQueueService>(ProductionQueueService);
  });

  describe('getQueueTail', () => {
    it('retorna aproximadamente agora quando a fila está vazia', async () => {
      prisma.production.findMany.mockResolvedValue([]);
      prisma.production_reservation.aggregate.mockResolvedValue({
        _max: { estimated_ready_at: null },
      });

      const before = Date.now();
      const result = await service.getQueueTail(1, 1);
      const after = Date.now();

      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('retorna date_end quando há production aberta no futuro, sem reservas', async () => {
      const futureDate = new Date(Date.now() + 10 * 86400000);
      prisma.production.findMany.mockResolvedValue([
        { id: 1, date_end: futureDate },
      ]);
      prisma.production_reservation.aggregate.mockResolvedValue({
        _max: { estimated_ready_at: null },
      });

      const result = await service.getQueueTail(1, 1);

      expect(result.getTime()).toBe(futureDate.getTime());
    });

    it('retorna o maior valor entre date_end e estimated_ready_at de reserva ativa', async () => {
      const productionDate = new Date(Date.now() + 5 * 86400000);
      const reservationDate = new Date(Date.now() + 15 * 86400000);
      prisma.production.findMany.mockResolvedValue([
        { id: 1, date_end: productionDate },
      ]);
      prisma.production_reservation.aggregate.mockResolvedValue({
        _max: { estimated_ready_at: reservationDate },
      });

      const result = await service.getQueueTail(1, 1);

      expect(result.getTime()).toBe(reservationDate.getTime());
    });

    it('ignora registros com date_end nulo sem lançar exceção, considerando só os com data', async () => {
      const validDate = new Date(Date.now() + 8 * 86400000);
      prisma.production.findMany.mockResolvedValue([
        { id: 1, date_end: null },
        { id: 2, date_end: validDate },
      ]);
      prisma.production_reservation.aggregate.mockResolvedValue({
        _max: { estimated_ready_at: null },
      });

      const result = await service.getQueueTail(1, 1);

      expect(result.getTime()).toBe(validDate.getTime());
    });
  });

  describe('finishDateFor', () => {
    it('lança ProductionCapacityUnavailableError quando não há capacidade ativa', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue(null);

      await expect(service.finishDateFor(1, 1, 10)).rejects.toThrow(
        ProductionCapacityUnavailableError,
      );
    });

    it('lança ProductionCapacityUnavailableError quando a capacidade existe mas está inativa', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue({
        transformation_workshop_fk: 1,
        product_fk: 1,
        monthly_capacity: 35,
        active: false,
      });

      await expect(service.finishDateFor(1, 1, 10)).rejects.toThrow(
        ProductionCapacityUnavailableError,
      );
    });

    it('reproduz o cenário motivador: OT A 35/mês e OT B 15/mês, fila vazia, pedido de 30 unidades', async () => {
      prisma.production.findMany.mockResolvedValue([]);
      prisma.production_reservation.aggregate.mockResolvedValue({
        _max: { estimated_ready_at: null },
      });

      prisma.production_capacity.findUnique.mockResolvedValueOnce({
        transformation_workshop_fk: 1,
        product_fk: 1,
        monthly_capacity: 35,
        active: true,
      });
      const resultA = await service.finishDateFor(1, 1, 30);

      prisma.production_capacity.findUnique.mockResolvedValueOnce({
        transformation_workshop_fk: 2,
        product_fk: 1,
        monthly_capacity: 15,
        active: true,
      });
      const resultB = await service.finishDateFor(2, 1, 30);

      const now = Date.now();
      const daysA = (resultA.getTime() - now) / 86400000;
      const daysB = (resultB.getTime() - now) / 86400000;

      // 30 * 30/35 ≈ 25,7 dias ; 30 * 30/15 = 60 dias
      expect(daysA).toBeCloseTo(25.714, 1);
      expect(daysB).toBeCloseTo(60, 1);
      expect(daysB).toBeGreaterThan(daysA);
    });

    it('não trava para quantidade maior que a capacidade de 1 mês (taxa contínua, sem regra especial)', async () => {
      prisma.production.findMany.mockResolvedValue([]);
      prisma.production_reservation.aggregate.mockResolvedValue({
        _max: { estimated_ready_at: null },
      });
      prisma.production_capacity.findUnique.mockResolvedValue({
        transformation_workshop_fk: 2,
        product_fk: 1,
        monthly_capacity: 15,
        active: true,
      });

      const result = await service.finishDateFor(2, 1, 50);
      const days = (result.getTime() - Date.now()) / 86400000;

      // 50 * 30/15 = 100 dias
      expect(days).toBeCloseTo(100, 0);
    });
  });
});
