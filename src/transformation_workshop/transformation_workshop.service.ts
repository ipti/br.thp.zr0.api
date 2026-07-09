import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateTransformationWorkshopDto } from './dto/create-transformation_workshop.dto';
import { QueryTransformationWorkshopDto } from './dto/query-transformation_workshop.dto';
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

  async findAll(query: QueryTransformationWorkshopDto) {
    try {
      const { page = 1, limit = 20, ...rest } = query;
      const skip = (page - 1) * limit;
      const where = { deletedAt: null, ...rest };
      const [data, total] = await Promise.all([
        this.prisma.transformation_workshop.findMany({ skip, take: limit, where }),
        this.prisma.transformation_workshop.count({ where }),
      ]);
      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
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
        await this.prisma.transformation_workshop.update({
          where: { id: id },
          data: { deletedAt: new Date() },
        });
      return transformation_workshop;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
