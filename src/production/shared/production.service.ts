import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateProductionDto } from '../dto/create-production.dto';
import { UpdateProductionDto } from '../dto/update-production.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';
import { QueryProductionDto } from '../dto/query-production.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) { }
  async create(createProductionDto: CreateProductionDto) {
    try {
      const createProduction = await this.prisma.production.create({
        data: {
          quantity: createProductionDto.quantity,
          date_start: createProductionDto.dateStart,
          date_end: createProductionDto.dateEnd,
          status: createProductionDto.status,
          product: { connect: { id: createProductionDto.idProduct } },
          transformation_workshop: { connect: { id: createProductionDto.idTransformationWorkshop } },
        },
      });

      return createProduction;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryProductionDto) {
    try {
      const { page = 1, limit = 20, ...rest } = query;
      const skip = (page - 1) * limit;
      const selectInfo = {
        id: true,
        date_start: true,
        date_end: true,
        status: true,
        quantity: true,
      };
      const filters: Prisma.productionWhereInput = isEmpty(rest)
        ? {}
        : {
            ...(rest.id !== undefined ? { id: Number(rest.id) } : {}),
            ...(rest.dateStart !== undefined
              ? { date_start: new Date(rest.dateStart) }
              : {}),
            ...(rest.dateEnd !== undefined
              ? { date_end: new Date(rest.dateEnd) }
              : {}),
            ...(rest.status !== undefined ? { status: rest.status } : {}),
            ...(rest.quantity !== undefined ? { quantity: rest.quantity } : {}),
            ...(rest.idProduct !== undefined
              ? { product_fk: rest.idProduct }
              : {}),
            ...(rest.idTransformationWorkshop !== undefined
              ? {
                  transformation_workshop_fk:
                    rest.idTransformationWorkshop,
                }
              : {}),
          };

      const [data, total] = await Promise.all([
        this.prisma.production.findMany({
          skip,
          take: limit,
          select: { ...selectInfo, product: true, transformation_workshop: true },
          where: filters,
        }),
        this.prisma.production.count({ where: filters }),
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
      console.error('Erro ao buscar produção:', err);
      throw new HttpException(
        'Erro ao buscar produção',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(id: number) {
    const production = await this.prisma.production.findUnique({
      where: { id: id },
    });

    if (!production) {
      throw new HttpException('Production not found', HttpStatus.NOT_FOUND);
    }

    return production;
  }

  async update(id: number, updateProductionDto: UpdateProductionDto) {
    try {
      const production = await this.findOne(id);

      if (!production) {
        throw new HttpException('Production not found', HttpStatus.NOT_FOUND);
      }

      const updatedProduction = await this.prisma.production.update({
        where: {
          id,
        },
        data: {
          date_start: updateProductionDto.dateStart,
          date_end: updateProductionDto.dateEnd,
          quantity: updateProductionDto.quantity,
          status: updateProductionDto.status,
          product: { connect: { id: updateProductionDto.idProduct ?? production.product_fk! } },
          transformation_workshop: { connect: { id: updateProductionDto.idTransformationWorkshop ?? production.transformation_workshop_fk! } },
        },
      });

      return updatedProduction;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const production = await this.findOne(+id);
      if (!production) {
        throw new HttpException('Production not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.production.delete({
        where: { id: production.id },
      });

      return { message: 'Production deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
