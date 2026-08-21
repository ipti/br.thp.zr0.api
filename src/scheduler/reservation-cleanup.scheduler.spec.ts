import { Test, TestingModule } from '@nestjs/testing';
import { ReservationCleanupScheduler } from './reservation-cleanup.scheduler';
import { CheckoutService } from '../checkout/checkout.service';
import { ProductionOrderService } from '../production-order/shared/production-order.service';

describe('ReservationCleanupScheduler', () => {
  let scheduler: ReservationCleanupScheduler;
  let checkoutService: { releaseExpiredReservations: jest.Mock };
  let productionOrderService: {
    releaseExpiredProductionReservations: jest.Mock;
  };

  beforeEach(async () => {
    checkoutService = {
      releaseExpiredReservations: jest.fn().mockResolvedValue({ released: 2 }),
    };
    productionOrderService = {
      releaseExpiredProductionReservations: jest
        .fn()
        .mockResolvedValue({ released: 3 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationCleanupScheduler,
        { provide: CheckoutService, useValue: checkoutService },
        { provide: ProductionOrderService, useValue: productionOrderService },
      ],
    }).compile();

    scheduler = module.get<ReservationCleanupScheduler>(
      ReservationCleanupScheduler,
    );
  });

  it('chama as duas limpezas em um ciclo normal', async () => {
    await scheduler.handleCron();

    expect(checkoutService.releaseExpiredReservations).toHaveBeenCalledTimes(1);
    expect(
      productionOrderService.releaseExpiredProductionReservations,
    ).toHaveBeenCalledTimes(1);
  });

  it('ignora uma segunda execução enquanto a primeira ainda está em andamento', async () => {
    let resolveFirst: () => void = () => {};
    checkoutService.releaseExpiredReservations.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = () => resolve({ released: 0 });
        }),
    );

    const firstRun = scheduler.handleCron();
    const secondRun = scheduler.handleCron();

    resolveFirst();
    await Promise.all([firstRun, secondRun]);

    expect(checkoutService.releaseExpiredReservations).toHaveBeenCalledTimes(1);
    expect(
      productionOrderService.releaseExpiredProductionReservations,
    ).toHaveBeenCalledTimes(1);
  });

  it('permite nova execução após o ciclo anterior terminar', async () => {
    await scheduler.handleCron();
    await scheduler.handleCron();

    expect(checkoutService.releaseExpiredReservations).toHaveBeenCalledTimes(2);
  });

  it('falha na limpeza de stock_reservation não impede a limpeza de production_reservation', async () => {
    checkoutService.releaseExpiredReservations.mockRejectedValue(
      new Error('falha no checkout'),
    );

    await expect(scheduler.handleCron()).resolves.toBeUndefined();

    expect(
      productionOrderService.releaseExpiredProductionReservations,
    ).toHaveBeenCalledTimes(1);
  });

  it('falha na limpeza de production_reservation não impede a limpeza de stock_reservation', async () => {
    productionOrderService.releaseExpiredProductionReservations.mockRejectedValue(
      new Error('falha na produção'),
    );

    await expect(scheduler.handleCron()).resolves.toBeUndefined();

    expect(checkoutService.releaseExpiredReservations).toHaveBeenCalledTimes(1);
  });

  it('libera a guarda de execução mesmo quando as duas limpezas falham', async () => {
    checkoutService.releaseExpiredReservations.mockRejectedValue(
      new Error('falha no checkout'),
    );
    productionOrderService.releaseExpiredProductionReservations.mockRejectedValue(
      new Error('falha na produção'),
    );

    await scheduler.handleCron();
    await scheduler.handleCron();

    expect(checkoutService.releaseExpiredReservations).toHaveBeenCalledTimes(2);
  });
});
