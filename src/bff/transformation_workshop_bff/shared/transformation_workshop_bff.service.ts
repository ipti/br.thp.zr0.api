import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';
import { AddUserTransformationWorkshopDto } from '../dto/transformation_workshop_add_user.dto';

@Injectable()
export class TransformationWorkshopBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) { }

  async transformationWorkshopUser(userId: number) {
    try {
      const user = await this.usersService.findOne(userId);

      if (user.role === 'ADMIN') {
        const transformationWorkshopUser =
          await this.prisma.transformation_workshop.findMany({
            include: {
              city: true,
              state: true,
            },
          });

        return transformationWorkshopUser.map((item) => {
          return { transformation_workshop: item };
        });
      }
      const transformationWorkshopUser =
        await this.prisma.transformation_workshop_user.findMany({
          where: {
            user_fk: userId,
          },
          select: {
            transformation_workshop: {
              include: {
                state: true,
                city: true,
              },
            },
          },
        });

      return transformationWorkshopUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async transformationWorkshopOne(id: number) {
    try {
      const transformationWorkshopOne =
        await this.prisma.transformation_workshop.findUnique({
          where: {
            id: id,
          },
          include: {
            state: true,
            city: true,
            order_service: {
              take: 5,
              include: {
                _count: {
                  select: {
                    order_item: true,
                  },
                },
              },
            },
            transformation_workshop_product: {
              take: 5,
              select: {
                id: true,
                quantity: true,
                product: {
                  include: {
                    product_image: true,
                  },
                },
              },
            },
            transformation_workshop_user: {
              take: 5,
              select: {
                users: true,
              },
            },
          },
        });

      return transformationWorkshopOne;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async addUserTransformationWorkshop(
    addUserTransformationWorkshopDto: AddUserTransformationWorkshopDto,
  ) {
    try {
      const transformationWorkshopUserFind =
        await this.prisma.transformation_workshop_user.findFirst({
          where: {
            transformation_workshop_fk: addUserTransformationWorkshopDto.tw_fk,
            user_fk: addUserTransformationWorkshopDto.user_fk,
          },
        });

      if (transformationWorkshopUserFind) {
        throw new HttpException(
          'Usuário já pertence a Oficina de transformação!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transformation_workshop_user_create =
        await this.prisma.transformation_workshop_user.create({
          data: {
            users: {
              connect: { id: addUserTransformationWorkshopDto.user_fk },
            },
            transformation_workshop: {
              connect: { id: addUserTransformationWorkshopDto.tw_fk },
            },
          },
        });

      return transformation_workshop_user_create;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async getMemberTransformationWorkshop(id: number) {
    try {
      const members = await this.prisma.transformation_workshop.findUnique({
        where: {
          id: id,
        },
        select: {
          transformation_workshop_user: {
            include: {
              users: {
                select: {
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });
      return members;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async getOrdersTransformationWorkshop(
    id: number,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.prisma.transformation_workshop.findUnique({
          where: { id },
          select: {
            order_service: {
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
              include: {
                _count: { select: { order_item: true } },
                order_item: true,
                order: {
                  select: {
                    payment_status: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.order_service.count({
          where: { transformation_workshop_fk: id },
        }),
      ]);

      // transforma cada order e adiciona o campo totalProducts
      const ordersWithTotalProducts = orders?.order_service.map((order) => {
        const totalProducts = order.order_item.reduce(
          (acc, item) => acc + item.quantity,
          0,
        );
        return {
          ...order,
          totalProducts,
        };
      });

      return {
        data: ordersWithTotalProducts,
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

  async getPoductTransformationWorkshop(id: number) {
    try {
      const members = await this.prisma.transformation_workshop.findUnique({
        where: {
          id: id,
        },
        select: {
          transformation_workshop_product: {
            include: {
              product: {
                include: {
                  product_image: true,
                },
              },
            },
          },
        },
      });
      return members;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
