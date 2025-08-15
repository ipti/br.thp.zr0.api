import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const { userId, items, observation, address } = createOrderDto;

    const workshop: number[] = [];

    // Busca os dados reais dos produtos e variantes
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new HttpException(
            `Produto ${item.productId} não encontrado`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const unitPrice = product.price ?? 0;

        const totalPrice = unitPrice * item.quantity;

        if (!workshop.find((id) => id === item.workshopId))
          workshop.push(item.workshopId);

        return {
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          product: { connect: { id: item.productId } },
          delivery_estimate: item.delivery_estimate,
        };
      }),
    );

    // Calcula o total do pedido
    const total = orderItems.reduce((acc, item) => acc + item.total_price, 0);

    // Cria o pedido
    const transaction = await this.prisma.$transaction(async (tx) => {
      for (const workshopId of workshop) {
        const order = await tx.order.create({
          data: {
            user: { connect: { id: userId } },
            total_amount: total,
            status: 'PENDING',
            notes: observation,
            workshop: { connect: { id: workshopId } },
            order_items: {
              create: orderItems,
            },
          },
          include: {
            order_items: true,
          },
        });

        if (address) {
          await tx.order_delivery_address.create({
            data: {
              cep: address?.cep,
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
      }

      return { message: 'Pedido criado com sucesso!' };
    });
    return transaction;
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
