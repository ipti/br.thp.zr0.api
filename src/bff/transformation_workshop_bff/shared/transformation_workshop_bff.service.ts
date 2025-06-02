import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';
import { AddUserTransformationWorkshopDto } from '../dto/transformation_workshop_add_user.dto';

@Injectable()
export class TransformationWorkshopBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async transformationWorkshopUser(userId: number) {
    try {
      const user = await this.usersService.findOne(userId);

      if (user.role === 'ADMIN') {
        const transformationWorkshopUser =
          await this.prisma.transformation_workshop_user.findMany({
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
            transformation_workshop_user: {
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
}
