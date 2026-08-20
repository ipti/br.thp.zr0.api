import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductionQueueService } from 'src/production/shared/production-queue.service';
import { MeuEnvioShippingStrategy } from 'src/shipping/strategies/meu-envio-shipping.strategy';
import { SimulateProductionOrderDto } from '../dto/simulate-production-order.dto';
import { ReserveProductionOrderDto } from '../dto/reserve-production-order.dto';
import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import {
  ShipmentAllocation,
  SimulationPlan,
  SimulationResult,
} from '../entities/simulation.entity';
import {
  ProductionReservationAllocation,
  ReservationResult,
} from '../entities/reservation.entity';

const MILLISECONDS_PER_DAY = 86400000;
const RESERVATION_TTL_MS = 15 * 60 * 1000;

interface Candidate {
  workshopId: number;
  workshopName: string;
  monthlyCapacity: number;
  freightCost: number;
  freightService: string;
  freightDeliveryDaysBusiness: number;
}

/** Aproximação: dias úteis -> dias corridos. Estimativa, não garantia contratual. */
function businessDaysToCalendarDays(businessDays: number): number {
  return Math.ceil((businessDays * 7) / 5);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
}

@Injectable()
export class ProductionOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionQueueService: ProductionQueueService,
    private readonly meuEnvioShippingStrategy: MeuEnvioShippingStrategy,
  ) {}

  async simulate(dto: SimulateProductionOrderDto): Promise<SimulationResult> {
    const product = await this.prisma.product.findFirst({
      where: { uid: dto.productId },
    });

    if (!product) {
      throw new HttpException(
        `Produto ${dto.productId} não encontrado`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const activeCapacities = await this.prisma.production_capacity.findMany({
      where: { product_fk: product.id, active: true },
      include: { transformation_workshop: true },
    });

    if (activeCapacities.length === 0) {
      return { unavailable: true };
    }

    const candidates: Candidate[] = await Promise.all(
      activeCapacities.map(async (capacity) => {
        const freight = await this.meuEnvioShippingStrategy.calculatePrice(
          dto.destinationZipCode,
          capacity.transformation_workshop.cep ?? '',
          {
            width: product.width,
            height: product.height,
            length: product.length,
            weight: product.weight,
          },
        );
        return {
          workshopId: capacity.transformation_workshop_fk,
          workshopName: capacity.transformation_workshop.name,
          monthlyCapacity: capacity.monthly_capacity,
          freightCost: freight.cost,
          freightService: freight.service,
          freightDeliveryDaysBusiness: freight.deliveryTimeDays,
        };
      }),
    );

    const [costPlan, deadlinePlan] = await Promise.all([
      this.buildCostPlan(product.id, dto.quantity, candidates),
      this.buildDeadlinePlan(product.id, dto.quantity, candidates),
    ]);

    return { costPlan, deadlinePlan };
  }

  /**
   * Modo custo: capacidade não é um recurso finito disputado dentro de um
   * único pedido (é taxa contínua) — atribui a quantidade inteira à OT ativa
   * de frete mais barato. Só recorreria a outra OT por inviabilidade técnica
   * (nenhum caso previsto aqui, já que todos os candidatos vieram ativos).
   */
  private async buildCostPlan(
    productId: number,
    quantity: number,
    candidates: Candidate[],
  ): Promise<SimulationPlan> {
    const cheapest = [...candidates].sort(
      (a, b) => a.freightCost - b.freightCost,
    )[0];

    const readyAt = await this.productionQueueService.finishDateFor(
      cheapest.workshopId,
      productId,
      quantity,
    );
    const deliveryAt = addDays(
      readyAt,
      businessDaysToCalendarDays(cheapest.freightDeliveryDaysBusiness),
    );

    const shipment: ShipmentAllocation = {
      workshopId: cheapest.workshopId,
      workshopName: cheapest.workshopName,
      quantity,
      freightCost: cheapest.freightCost,
      freightService: cheapest.freightService,
      freightDeliveryDaysBusiness: cheapest.freightDeliveryDaysBusiness,
      readyAt,
      deliveryAt,
    };

    return {
      mode: 'COST',
      shipments: [shipment],
      totalCost: shipment.freightCost,
      maxDeliveryAt: shipment.deliveryAt,
    };
  }

  /**
   * Modo prazo: particiona a quantidade entre OTs em paralelo (scheduling
   * guloso incremental por "chunks") para minimizar o prazo máximo do
   * pedido — pode custar mais (fretes extras) do que o modo custo.
   */
  private async buildDeadlinePlan(
    productId: number,
    quantity: number,
    candidates: Candidate[],
  ): Promise<SimulationPlan> {
    const chunkSize = Math.max(
      1,
      Math.ceil(quantity / (candidates.length * 5)),
    );

    const cursors = await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        queueTail: await this.productionQueueService.getQueueTail(
          candidate.workshopId,
          productId,
        ),
        allocated: 0,
      })),
    );

    let remaining = quantity;
    while (remaining > 0) {
      const chunk = Math.min(chunkSize, remaining);

      let bestIndex = 0;
      let bestDeliveryAt = Infinity;
      let bestFinishAt = cursors[0].queueTail;

      for (let i = 0; i < cursors.length; i++) {
        const cursor = cursors[i];
        const durationDays = (chunk * 30) / cursor.monthlyCapacity;
        const finishAt = addDays(cursor.queueTail, durationDays);
        const deliveryAt = addDays(
          finishAt,
          businessDaysToCalendarDays(cursor.freightDeliveryDaysBusiness),
        );

        if (deliveryAt.getTime() < bestDeliveryAt) {
          bestDeliveryAt = deliveryAt.getTime();
          bestIndex = i;
          bestFinishAt = finishAt;
        }
      }

      cursors[bestIndex].allocated += chunk;
      cursors[bestIndex].queueTail = bestFinishAt;
      remaining -= chunk;
    }

    const shipments: ShipmentAllocation[] = cursors
      .filter((cursor) => cursor.allocated > 0)
      .map((cursor) => ({
        workshopId: cursor.workshopId,
        workshopName: cursor.workshopName,
        quantity: cursor.allocated,
        freightCost: cursor.freightCost,
        freightService: cursor.freightService,
        freightDeliveryDaysBusiness: cursor.freightDeliveryDaysBusiness,
        readyAt: cursor.queueTail,
        deliveryAt: addDays(
          cursor.queueTail,
          businessDaysToCalendarDays(cursor.freightDeliveryDaysBusiness),
        ),
      }));

    const totalCost = shipments.reduce((acc, s) => acc + s.freightCost, 0);
    const maxDeliveryAt = shipments.reduce(
      (max, s) => (s.deliveryAt.getTime() > max.getTime() ? s.deliveryAt : max),
      shipments[0].deliveryAt,
    );

    return {
      mode: 'DEADLINE',
      shipments,
      totalCost,
      maxDeliveryAt,
    };
  }

  async releaseExpiredProductionReservations() {
    const released = await this.prisma.production_reservation.deleteMany({
      where: {
        expires_at: { lte: new Date() },
        order_fk: null,
      },
    });

    return { released: released.count };
  }

  /**
   * Reserva temporariamente (TTL) a capacidade de produção do plano
   * escolhido pelo cliente. `estimated_ready_at` é sempre recalculado no
   * servidor, dentro da transação — nunca aceito do payload do cliente, que
   * reflete apenas o instante da simulação.
   */
  async reserve(dto: ReserveProductionOrderDto): Promise<ReservationResult> {
    await this.releaseExpiredProductionReservations();

    const product = await this.prisma.product.findFirst({
      where: { uid: dto.productId },
    });

    if (!product) {
      throw new HttpException(
        `Produto ${dto.productId} não encontrado`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

    // Ordenação determinística (workshopId asc) antes de qualquer leitura,
    // para evitar deadlock entre chamadas concorrentes de reserve() que
    // travam os mesmos pares em ordens diferentes.
    const orderedShipments = [...dto.shipments].sort(
      (a, b) => a.workshopId - b.workshopId,
    );

    return this.prisma.$transaction(
      async (tx) => {
        // Reservas pendentes do próprio usuário (sem pedido vinculado) são
        // limpas antes de criar as novas, evitando acumular fatias órfãs se
        // o cliente reabrir a jornada de encomenda.
        await tx.production_reservation.deleteMany({
          where: { user_fk: dto.userId, order_fk: null },
        });

        const reservations: ProductionReservationAllocation[] = [];

        for (const shipment of orderedShipments) {
          await tx.$queryRaw`SELECT monthly_capacity, active FROM production_capacity WHERE transformation_workshop_fk = ${shipment.workshopId} AND product_fk = ${product.id} FOR UPDATE`;

          const capacity = await tx.production_capacity.findUnique({
            where: {
              transformation_workshop_fk_product_fk: {
                transformation_workshop_fk: shipment.workshopId,
                product_fk: product.id,
              },
            },
          });

          if (!capacity || !capacity.active) {
            throw new HttpException(
              'Capacidade de produção não está mais ativa para este item',
              HttpStatus.CONFLICT,
            );
          }

          const estimatedReadyAt =
            await this.productionQueueService.finishDateFor(
              shipment.workshopId,
              product.id,
              shipment.quantity,
              tx,
            );

          const reservation = await tx.production_reservation.create({
            data: {
              product: { connect: { id: product.id } },
              transformation_workshop: { connect: { id: shipment.workshopId } },
              quantity: shipment.quantity,
              user: { connect: { id: dto.userId } },
              expires_at: expiresAt,
              estimated_ready_at: estimatedReadyAt,
            },
          });

          reservations.push({
            workshopId: shipment.workshopId,
            quantity: shipment.quantity,
            productionReservationId: reservation.id,
            estimatedReadyAt,
          });
        }

        return { expiresAt, reservations };
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  private generateUid(prefix: string) {
    return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Confirma o Pedido de Encomenda: revalida cada `production_reservation`
   * (nunca confia apenas no payload), cria `order` com `sale_type=ENCOMENDA`,
   * um `order_service` por OT e uma linha `production` por fatia — tudo
   * dentro da mesma transação. Este fluxo nunca toca `orders.service.ts`
   * nem `stock_reservation`/`inventory`.
   */
  async create(dto: CreateProductionOrderDto) {
    const product = await this.prisma.product.findFirst({
      where: { uid: dto.productId },
    });

    if (!product) {
      throw new HttpException(
        `Produto ${dto.productId} não encontrado`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const date = new Date(Date.now());
      const uid = this.generateUid(
        `ZR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
      );

      // Revalida cada fatia contra a reserva feita em reserve() (TASK-05)
      // dentro da própria transação — nunca confia apenas no payload do
      // cliente, já que a reserva pode ter expirado entre reserve() e create().
      const shipmentsWithReservation = await Promise.all(
        dto.shipments.map(async (shipment) => {
          const reservation = await tx.production_reservation.findFirst({
            where: {
              user_fk: dto.userId,
              product_fk: product.id,
              transformation_workshop_fk: shipment.workshopId,
              quantity: shipment.quantity,
              expires_at: { gt: now },
              order_fk: null,
            },
          });

          if (!reservation) {
            throw new HttpException(
              'Reserva de produção não encontrada ou expirada',
              HttpStatus.BAD_REQUEST,
            );
          }

          return { shipment, reservation };
        }),
      );

      const order = await tx.order.create({
        data: {
          user: { connect: { id: dto.userId } },
          uid,
          sale_type: 'ENCOMENDA',
          simulation_mode: dto.simulationMode,
          payment_method: dto.paymentMethod ?? 'PIX',
          notes: dto.observation,
          total_amount: 0,
        },
      });

      if (dto.address) {
        await tx.order_delivery_address.create({
          data: {
            name: dto.address.name,
            phone: dto.address.phone,
            cep: dto.address.cep,
            address: dto.address.address,
            number: dto.address.number,
            complement: dto.address.complement,
            neighborhood: dto.address.neighborhood,
            ...(dto.address.stateId
              ? { state: { connect: { id: dto.address.stateId } } }
              : {}),
            ...(dto.address.cityId
              ? { city: { connect: { id: dto.address.cityId } } }
              : {}),
            order: { connect: { id: order.id } },
          },
        });
      }

      let totalAmount = 0;
      const reservationIds: number[] = [];

      for (const { shipment, reservation } of shipmentsWithReservation) {
        const unitPrice = product.price ?? 0;
        const totalPrice = unitPrice * shipment.quantity;
        totalAmount += totalPrice;

        const uidService = this.generateUid(
          `OS-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
        );

        const orderService = await tx.order_service.create({
          data: {
            uid: uidService,
            transformation_workshop: { connect: { id: shipment.workshopId } },
            order: { connect: { id: order.id } },
            status: 'PENDING',
            total_amount: totalPrice,
            estimated_ready_at: reservation.estimated_ready_at,
            estimated_delivery_at: shipment.estimatedDeliveryAt
              ? new Date(shipment.estimatedDeliveryAt)
              : null,
            order_item: {
              create: [
                {
                  product: { connect: { id: product.id } },
                  quantity: shipment.quantity,
                  unit_price: unitPrice,
                  total_price: totalPrice,
                },
              ],
            },
          },
          include: { order_item: true },
        });

        const createdOrderItem = orderService.order_item[0];

        await tx.production.create({
          data: {
            product: { connect: { id: product.id } },
            transformation_workshop: { connect: { id: shipment.workshopId } },
            quantity: shipment.quantity,
            production_status: 'QUEUED',
            date_start: now,
            date_end: reservation.estimated_ready_at,
            order_item: { connect: { id: createdOrderItem.id } },
          },
        });

        reservationIds.push(reservation.id);
      }

      await tx.order.update({
        where: { id: order.id },
        data: { total_amount: totalAmount },
      });

      await tx.production_reservation.updateMany({
        where: { id: { in: reservationIds } },
        data: { order_fk: order.id },
      });

      return {
        message: 'Pedido de encomenda criado com sucesso!',
        orders: [{ id: order.id, uid: order.uid }],
      };
    });
  }
}
