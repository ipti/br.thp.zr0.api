import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';

@Injectable()
export class OrdersBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) { }

  async ordersFromWorkshopTransformation(twId: number) {
    try {
      const tw = this.prisma.order.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        where: {
          order_services: {
            every: {transformation_workshop_fk: twId}
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


}
