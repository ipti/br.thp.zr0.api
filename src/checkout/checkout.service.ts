// checkout.service.ts
import { Injectable } from '@nestjs/common';

import { ShippingService } from '../shipping/shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-checkout.dto';
import { CheckoutResult } from './entities/checkout.entity';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly prisma: PrismaService,
  ) {}

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
        product: {
          connect: { id: product.id },
        },
      };
    });

    // Criação do pedido
    const order = await this.prisma.order.create({
      data: {
        user: { connect: { id: dto.customerId } },
        workshop: dto.workshopId
          ? { connect: { id: dto.workshopId } }
          : undefined,
        total_amount: total,
        status: 'PENDING',
        payment_method: dto.paymentMethod,
        payment_status: 'PENDING',
        order_items: {
          create: orderItemsData,
        },
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
}
