import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { EmailService } from 'src/utils/middleware/email.middleware';

@Injectable()
export class OrdersBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService

  ) { }

  async ordersFromWorkshopTransformation(twId: number) {
    try {
      const tw = this.prisma.order.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        where: {
          order_services: {
            every: { transformation_workshop_fk: twId }
          },
        },
      })

      return tw

    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async ordersFromWorkshopTransformationFindOne(id: number, twId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        order_services: {
          where: { transformation_workshop_fk: twId },
          include: {
            order_item: {
              include: {
                product: true,
                variant: true,
              },
            },
            transformation_workshop: {
              include: { state: true, city: true },
            },
          }
        },
        order_delivery_address: {
          include: { state: true, city: true },
        },
      },
    });

    if (!order) {
      throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
    }

    return order;
  }

  async getOrdersSolitedCancellation(
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          skip,
          take: limit,

          orderBy: { createdAt: 'desc' },
          where: {
            order_services: {
              some: {
                status: 'SOLITED_CANCELLATION',
              },
            },
          },
          select: {
            id: true,
            uid: true,
            createdAt: true,
            payment_status: true,
            total_amount: true,
            order_services: {

              include: {
                _count: { select: { order_item: true } },
                order_item: true,
              },
            },
          },
        }),
        this.prisma.order_service.count({
          where: { status: 'SOLITED_CANCELLATION' },
        }),
      ]);

      // transforma cada order e adiciona o campo totalProducts


      return {
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateOrderService(updateOrderDto: UpdateOrderDto) {
    try {
      // Verifica se o pedido existe
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: updateOrderDto.id_order },
        include: {
          user: true,
          order_delivery_address: {
            include: { state: true, city: true },
          },
          order_services: {
            include: {
              order_item: {
                include: {
                  product: { include: { product_image: true } },
                },
              },
            },
          },
        },
      });

      if (!existingOrder) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      }

      // Se houver itens no update


      // Atualiza os outros dados do pedido (opcional)
      const updatedOrder = await this.prisma.order.update({
        where: { id: updateOrderDto.id_order },
        data: {
          notes: updateOrderDto.observation,
          payment_status: updateOrderDto.payment_status,
          updatedAt: new Date(),
        },
        include: {
          order_services: {
            include: {
              order_item: true,
            },
          },
        },
      });

      // Atualizar status do order_service se houver
      if (updateOrderDto.status) {
        const orderService = await this.prisma.order_service.findFirst({
          where: { id: updateOrderDto.id_order_service }
        });

        if (orderService) {
          await this.prisma.order_service.update({
            where: { id: orderService.id },
            data: { status: updateOrderDto.status },
          });
        }
      }

      if (updateOrderDto.status === 'SHIPPED') {
        // Buscar os dados completos novamente para enviar email
        const fullOrder = await this.prisma.order.findUnique({
          where: { id: updateOrderDto.id_order },
          include: {
            user: true,
            order_delivery_address: {
              include: { state: true, city: true },
            },
            order_services: {
              include: {
                order_item: {
                  include: {
                    product: { include: { product_image: true } },
                  },
                },
              },
            },
          },
        });

        if (fullOrder?.user) {
          const products = fullOrder.order_services.flatMap((service: any) =>
            service.order_item.map((i: any) => ({
              id: i.product.uid,
              name: i.product.name,
              quantity: i.quantity,
              price: i.total_price,
              imagem: i.product.product_image[0]?.img_url ?? '',
            }))
          );

          await this.emailService.sendEmail(
            fullOrder.user.email ?? '',
            'Pedido enviado',
            'shippingOrder.hbs',
            {
              name_client: fullOrder.user.name,
              id_order: fullOrder.uid,
              total_amount: fullOrder.total_amount,
              payment_method: fullOrder.payment_method,
              address: fullOrder.order_delivery_address?.address,
              number: fullOrder.order_delivery_address?.number,
              neighborhood: fullOrder.order_delivery_address?.neighborhood,
              cep: fullOrder.order_delivery_address?.cep,
              state: fullOrder.order_delivery_address?.state?.name,
              city: fullOrder.order_delivery_address?.city?.name,
              products,
            },
          );
        }
      }

      return updatedOrder;
    } catch (err) {
      console.log(err);
      throw new HttpException(
        err,
        HttpStatus.BAD_REQUEST,
      );
    }
  }


}
