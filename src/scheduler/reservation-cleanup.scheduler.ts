import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CheckoutService } from '../checkout/checkout.service';
import { ProductionOrderService } from '../production-order/shared/production-order.service';

@Injectable()
export class ReservationCleanupScheduler {
  private readonly logger = new Logger(ReservationCleanupScheduler.name);
  private isRunning = false;

  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly productionOrderService: ProductionOrderService,
  ) {}

  @Cron(process.env.RESERVATION_CLEANUP_CRON ?? CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    if (this.isRunning) {
      this.logger.warn(
        'Ciclo de limpeza de reservas expiradas ignorado: execução anterior ainda em andamento.',
      );
      return;
    }

    this.isRunning = true;
    const startedAt = Date.now();

    try {
      const [stockResult, productionResult] = await Promise.all([
        this.releaseStockReservations(),
        this.releaseProductionReservations(),
      ]);

      this.logger.log(
        `Limpeza de reservas concluída em ${Date.now() - startedAt}ms — ` +
          `stock_reservation: ${stockResult}, production_reservation: ${productionResult}.`,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async releaseStockReservations(): Promise<number> {
    try {
      const { released } =
        await this.checkoutService.releaseExpiredReservations();
      return released;
    } catch (error) {
      this.logger.error(
        'Falha ao liberar stock_reservation expiradas.',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  private async releaseProductionReservations(): Promise<number> {
    try {
      const { released } =
        await this.productionOrderService.releaseExpiredProductionReservations();
      return released;
    } catch (error) {
      this.logger.error(
        'Falha ao liberar production_reservation expiradas.',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }
}
