// checkout.service.ts
import { Injectable } from '@nestjs/common';

import { ShippingService } from '../shipping/shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateStockReservationDto } from './dto/create-checkout.dto';
import { CheckoutResult } from './entities/checkout.entity';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly prisma: PrismaService,
  ) { }

  async processCheckout(dto: CreateOrderDto): Promise<CheckoutResult> {
    const productIds = dto.orderItems.map((i) => i.productId);

    // Busca os produtos com seus preços
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true },
    });

    // Monta os itens e calcula o total
    let total = 0;

    const orderItemsData = dto.orderItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.price == null)
        throw new Error(`Product ${item.productId} has no price`);

      const unitPrice = product.price;
      const totalPrice = unitPrice * item.quantity;

      total += totalPrice;

      return {
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        status: 'PENDING',
        product: {
          connect: { id: product.id },
        },
        transformation_workshop: dto.workshopId
          ? { connect: { id: dto.workshopId } }
          : undefined,
      };
    });

    const date = new Date(Date.now());
    const currentYear = date.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const order_list = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    });

    const uid = date.getFullYear().toString() + String(date.getMonth() + 1).padStart(2, '0') + String(order_list.length + 1).padStart(4, '0');

    // Criação do pedido
    const order = await this.prisma.order.create({
      data: {
        user: { connect: { id: dto.customerId } },
        total_amount: total,
        payment_method: dto.paymentMethod,
        payment_status: 'PENDING',
        uid: uid
      },
    });


    return {
      orderId: order.id,
      total,
      shipping: {
        cost: 0,
        service: 'Correios', // opcional: pegar do retorno de ShippingService
        deliveryTime: 5,
      },
      payment: {
        method: dto.paymentMethod,
        status: 'pending',
      },
    };
  }

  async releaseExpiredReservations() {
    const released = await this.prisma.stock_reservation.deleteMany({
      where: {
        expires_at: { lte: new Date() },
        order_fk: null,
      },
    });

    return { released: released.count };
  }

  async reserveStock(dto: CreateStockReservationDto) {
    await this.releaseExpiredReservations();

    const products = await this.prisma.product.findMany({
      where: { uid: { in: dto.items.map((item) => item.productId) } },
      select: { id: true, uid: true },
    });
    const productMap = new Map(products.map((product) => [product.uid, product.id]));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      await tx.stock_reservation.deleteMany({
        where: {
          user_fk: dto.userId,
          order_fk: null,
        },
      });

      for (const item of dto.items) {
        const productId = productMap.get(item.productId);
        if (!productId) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const stock = await tx.transformation_workshop_product.findFirst({
          where: {
            transformation_workshop_fk: item.workshopId,
            product_fk: productId,
          },
        });

        const reserved = await tx.stock_reservation.aggregate({
          _sum: { quantity: true },
          where: {
            product_fk: productId,
            transformation_workshop_fk: item.workshopId,
            expires_at: { gt: new Date() },
          },
        });

        const reservedQuantity = reserved._sum.quantity ?? 0;
        const availableQuantity = (stock?.quantity ?? 0) - reservedQuantity;

        if (!stock || availableQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        await tx.stock_reservation.create({
          data: {
            product: { connect: { id: productId } },
            transformation_workshop: { connect: { id: item.workshopId } },
            user: { connect: { id: dto.userId } },
            quantity: item.quantity,
            expires_at: expiresAt,
          },
        });
      }

      return { expiresAt };
    });
  }
}
