import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductionCapacityDto } from '../dto/create-production-capacity.dto';
import { UpdateProductionCapacityDto } from '../dto/update-production-capacity.dto';
import { QueryProductionCapacityDto } from '../dto/query-production-capacity.dto';

@Injectable()
export class ProductionCapacityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductionCapacityDto: CreateProductionCapacityDto) {
    try {
      return await this.prisma.production_capacity.create({
        data: {
          product: {
            connect: { id: createProductionCapacityDto.idProduct },
          },
          transformation_workshop: {
            connect: {
              id: createProductionCapacityDto.idTransformationWorkshop,
            },
          },
          monthly_capacity: createProductionCapacityDto.monthlyCapacity,
          active: createProductionCapacityDto.active ?? false,
        },
      });
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryProductionCapacityDto) {
    try {
      const {
        page = 1,
        limit = 20,
        idProduct,
        idTransformationWorkshop,
        active,
      } = query;
      const skip = (page - 1) * limit;

      const where = {
        ...(idProduct !== undefined ? { product_fk: Number(idProduct) } : {}),
        ...(idTransformationWorkshop !== undefined
          ? { transformation_workshop_fk: Number(idTransformationWorkshop) }
          : {}),
        ...(active !== undefined ? { active } : {}),
      };

      const [data, total] = await Promise.all([
        this.prisma.production_capacity.findMany({
          skip,
          take: limit,
          where,
          include: { product: true, transformation_workshop: true },
        }),
        this.prisma.production_capacity.count({ where }),
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
      console.error('Erro ao buscar capacidade de produção:', err);
      throw new HttpException(
        'Erro ao buscar capacidade de produção.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(transformation_workshop_fk: number, product_fk: number) {
    const productionCapacity = await this.prisma.production_capacity.findUnique(
      {
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
      },
    );

    if (!productionCapacity) {
      throw new HttpException(
        'Capacidade de produção não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return productionCapacity;
  }

  async update(
    transformation_workshop_fk: number,
    product_fk: number,
    updateProductionCapacityDto: UpdateProductionCapacityDto,
  ) {
    try {
      const existing = await this.prisma.production_capacity.findUnique({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
      });

      if (!existing) {
        throw new HttpException(
          'Capacidade de produção não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      return await this.prisma.production_capacity.update({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
        data: {
          ...(updateProductionCapacityDto.monthlyCapacity !== undefined
            ? { monthly_capacity: updateProductionCapacityDto.monthlyCapacity }
            : {}),
          ...(updateProductionCapacityDto.active !== undefined
            ? { active: updateProductionCapacityDto.active }
            : {}),
        },
      });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(transformation_workshop_fk: number, product_fk: number) {
    try {
      const existing = await this.prisma.production_capacity.findUnique({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
      });

      if (!existing) {
        throw new HttpException(
          'Capacidade de produção não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      await this.prisma.production_capacity.delete({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
      });

      return { message: 'Capacidade de produção removida com sucesso' };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
