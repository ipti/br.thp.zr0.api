import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Prisma } from '@prisma/client';
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createOrderDto: CreateOrderDto) {
    const { userId, items, observation, address } = createOrderDto;

    // Agrupar por workshop
    const workshops = [...new Set(items.map((i) => i.workshopId))];

    // Buscar todos os produtos de uma vez
    const productIds = items.map((i) => String(i.productId));
    const products = await this.prisma.product.findMany({
      where: { uid: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.uid, p]));

    // Buscar todos os produtos de workshop de uma vez
    const workshopProducts =
      await this.prisma.transformation_workshop_product.findMany({
        where: {
          transformation_workshop_fk: { in: workshops },
          product_fk: { in: products.map((i) => i.id) },
        },
      });
    const workshopProductMap = new Map(
      workshopProducts.map((wp) => [
        `${wp.transformation_workshop_fk}-${wp.product_fk}`,
        wp,
      ]),
    );

    return this.prisma.$transaction(async (tx) => {
      const createdOrders: any = [];

      for (const workshopId of workshops) {
        const itemsForWorkshop = items
          .filter((i) => i.workshopId === workshopId)
          .map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
              throw new HttpException(
                `Produto ${item.productId} não encontrado`,
                HttpStatus.BAD_REQUEST,
              );
            }

            const unitPrice = product.price ?? 0;
            const totalPrice = unitPrice * item.quantity;

            // Validação de estoque
            const wpKey = `${workshopId}-${product.id}`;
            const twProduct = workshopProductMap.get(wpKey);

            if (!twProduct || twProduct.quantity < item.quantity) {
              throw new HttpException(
                `Estoque insuficiente para produto ${item.productId} no workshop ${workshopId}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            return {
              quantity: item.quantity,
              unit_price: unitPrice,
              total_price: totalPrice,
              product: { connect: { id: product.id } },
              delivery_estimate: item.delivery_estimate,
            };
          });

        const total = itemsForWorkshop.reduce(
          (acc, i) => acc + i.total_price,
          0,
        );

        // Criar pedido
        const order = await tx.order.create({
          data: {
            user: { connect: { id: userId } },
            total_amount: total,
            status: 'PENDING',
            notes: observation,
            workshop: { connect: { id: workshopId } },
            order_items: { create: itemsForWorkshop },
          },
          include: { order_items: true },
        });

        // Criar endereço (se houver)
        if (address) {
          await tx.order_delivery_address.create({
            data: {
              cep: address.cep,
              address: address.address,
              number: address.number,
              complement: address.complement,
              neighborhood: address.neighborhood,
              state: { connect: { id: address.stateId } },
              city: { connect: { id: address.cityId } },
              order: { connect: { id: order.id } },
            },
          });
        }

        // Atualizar estoque dos produtos
        for (const item of itemsForWorkshop) {
          const wpKey = `${workshopId}-${item.product.connect.id}`;
          const twProduct = workshopProductMap.get(wpKey);
          if (twProduct) {
            await tx.transformation_workshop_product.update({
              where: { id: twProduct.id },
              data: { quantity: twProduct.quantity - item.quantity },
            });
          }
        }

        createdOrders.push(order);
      }

      return {
        message: 'Pedidos criados com sucesso!',
        orders: createdOrders.map((o) => ({ id: o.id, uid: o.uid })),
      };
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: true,
        workshop: true,
        order_items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        workshop: true,
        order_delivery_address: {
          include: { state: true, city: true },
        },
        order_items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    try {
      // Verifica se o pedido existe
      const existingOrder = await this.prisma.order.findUnique({
        where: { id },
      });

      if (!existingOrder) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      }

      // Se houver itens no update
      if (updateOrderDto.items && updateOrderDto.items.length > 0) {
        // Deleta os itens antigos
        await this.prisma.order_item.deleteMany({
          where: { order_fk: id },
        });

        const items: Prisma.order_itemCreateWithoutOrderInput[] = [];

        for (const item of updateOrderDto.items) {
          // Busca o produto
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new HttpException(
              `Produto com ID ${item.productId} não encontrado`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const totalPrice = (product?.price ?? 0) * item.quantity;

          items.push({
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            unit_price: product.price ?? 0,
            total_price: totalPrice,
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const total: number = items.reduce(
          (acc, item) => acc + item.total_price,
          0,
        );

        // Cria os novos itens no pedido
        await this.prisma.order.update({
          where: { id },
          data: {
            total_amount: total,
            order_items: {
              create: items,
            },
          },
        });
      }

      // Atualiza os outros dados do pedido (opcional)
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          notes: updateOrderDto.observation,
          status: updateOrderDto.status,
          updatedAt: new Date(),
        },
        include: {
          order_items: true,
        },
      });

      return updatedOrder;
    } catch (err) {
      console.error(err);
      throw new HttpException(
        'Erro ao atualizar pedido',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.order.delete({ where: { id } });
      return { message: 'Pedido removido com sucesso' };
    } catch (err) {
      console.error(err);
      throw new HttpException('Erro ao remover pedido', HttpStatus.BAD_REQUEST);
    }
  }
}
