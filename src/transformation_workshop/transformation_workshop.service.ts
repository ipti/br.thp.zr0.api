import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateTransformationWorkshopDto } from './dto/create-transformation_workshop.dto';
import { UpdateTransformationWorkshopDto } from './dto/update-transformation_workshop.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransformationWorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createTransformationWorkshopDto: CreateTransformationWorkshopDto,
    idUser: number,
  ) {
    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
        const createTransformationWorkshop =
          await tx.transformation_workshop.create({
            data: {
              ...createTransformationWorkshopDto,
            },
          });

        await tx.transformation_workshop_user.create({
          data: {
            transformation_workshop: {
              connect: { id: createTransformationWorkshop.id },
            },
            users: { connect: { id: idUser } },
          },
        });

        return createTransformationWorkshop;
      });
      return transaction;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll() {
    try {
      const transformation_workshop =
        await this.prisma.transformation_workshop.findMany();
      return transformation_workshop;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: number) {
    const transformation_workshop =
      await this.prisma.transformation_workshop.findUnique({ where: { id } });
    return transformation_workshop;
  }

  async update(
    id: number,
    updateTransformationWorkshopDto: UpdateTransformationWorkshopDto,
  ) {
    try {
      const transformation_workshop =
        await this.prisma.transformation_workshop.update({
          data: { ...updateTransformationWorkshopDto },
          where: {
            id: id,
          },
        });
      return transformation_workshop;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const transformation_workshop =
        await this.prisma.transformation_workshop.delete({
          where: {
            id: id,
          },
        });
      return transformation_workshop;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
