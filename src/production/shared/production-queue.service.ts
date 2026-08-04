import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Cliente Prisma padrão (singleton) ou o `tx` de uma transação em andamento.
 * Aceito como último parâmetro opcional em todos os métodos deste serviço
 * para que quem já esteja dentro de uma `$transaction` (ex.: TASK-05,
 * `reserve()`) enxergue, no mesmo cálculo, escritas feitas anteriormente na
 * própria transação — sem isso, o lock de `production_capacity` não impede
 * a race condition que a reserva de capacidade existe para fechar.
 */
type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

/**
 * Erro de domínio lançado quando não existe nenhuma `production_capacity`
 * ativa para o par (oficina, produto). Quem chamar `finishDateFor` deve
 * capturar esta exceção explicitamente (ex.: TASK-04, para responder
 * "pedido indisponível para este produto") em vez de deixar vazar como
 * um erro 500 genérico.
 */
export class ProductionCapacityUnavailableError extends Error {
  constructor(
    public readonly workshopId: number,
    public readonly productId: number,
  ) {
    super(
      `Nenhuma capacidade de produção ativa para workshop ${workshopId} e produto ${productId}`,
    );
    this.name = 'ProductionCapacityUnavailableError';
  }
}

const OPEN_PRODUCTION_STATUSES = ['QUEUED', 'IN_PROGRESS'] as const;

@Injectable()
export class ProductionQueueService {
  private readonly logger = new Logger(ProductionQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula o fim da fila (backlog) de uma OT para um produto: o maior
   * compromisso já assumido, seja lançamento manual da oficina
   * (`order_item_fk = null`) ou fatia de encomenda (`order_item_fk`
   * preenchido) — ambos entram no mesmo cálculo, sem distinção.
   */
  async getQueueTail(
    workshopId: number,
    productId: number,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<Date> {
    const now = new Date();

    const openProductions = await client.production.findMany({
      where: {
        transformation_workshop_fk: workshopId,
        product_fk: productId,
        production_status: { in: [...OPEN_PRODUCTION_STATUSES] },
      },
      select: { id: true, date_end: true },
    });

    const productionsWithoutDate = openProductions.filter(
      (p) => p.date_end == null,
    );
    if (productionsWithoutDate.length > 0) {
      this.logger.warn(
        `production com date_end nulo ignorado(s) no cálculo da fila (workshop=${workshopId}, product=${productId}): ids ${productionsWithoutDate
          .map((p) => p.id)
          .join(', ')}`,
      );
    }

    const dateEndMax = openProductions
      .map((p) => p.date_end)
      .filter((d): d is Date => d != null)
      .reduce((max, d) => (d > max ? d : max), new Date(0));

    const activeReservation = await client.production_reservation.aggregate({
      where: {
        transformation_workshop_fk: workshopId,
        product_fk: productId,
        expires_at: { gt: now },
      },
      _max: { estimated_ready_at: true },
    });
    const estimatedReadyAtMax =
      activeReservation._max.estimated_ready_at ?? new Date(0);

    return new Date(
      Math.max(
        dateEndMax.getTime(),
        estimatedReadyAtMax.getTime(),
        now.getTime(),
      ),
    );
  }

  /**
   * Retorna a capacidade ativa do par (oficina, produto), ou `null` se não
   * existir ou estiver desativada. Extraído como método próprio porque a
   * TASK-04 precisa da mesma checagem tanto no modo custo quanto no modo
   * prazo, para decidir se uma OT é candidata à produção sob encomenda.
   */
  async getActiveCapacity(
    workshopId: number,
    productId: number,
    client: PrismaClientOrTx = this.prisma,
  ) {
    const capacity = await client.production_capacity.findUnique({
      where: {
        transformation_workshop_fk_product_fk: {
          transformation_workshop_fk: workshopId,
          product_fk: productId,
        },
      },
    });

    if (!capacity || !capacity.active) return null;
    return capacity;
  }

  /**
   * Data estimada em que uma OT termina de produzir `quantity` unidades de
   * um produto, assumindo produção do zero (nunca consulta estoque). Taxa
   * contínua — sem balde mensal: pedidos maiores que a capacidade de um mês
   * simplesmente empurram a data mais para frente, sem regra especial.
   */
  async finishDateFor(
    workshopId: number,
    productId: number,
    quantity: number,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<Date> {
    const capacity = await this.getActiveCapacity(
      workshopId,
      productId,
      client,
    );
    if (!capacity) {
      throw new ProductionCapacityUnavailableError(workshopId, productId);
    }

    const queueTail = await this.getQueueTail(workshopId, productId, client);
    const durationDays = (quantity * 30) / capacity.monthly_capacity;

    return new Date(queueTail.getTime() + durationDays * 86400000);
  }
}
