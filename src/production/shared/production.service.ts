import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateProductionDto } from '../dto/create-production.dto';
import { UpdateProductionDto } from '../dto/update-production.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';
import { QueryProductionDto } from '../dto/query-production.dto';
import { Prisma } from '@prisma/client';
import { ProductionQueueService } from './production-queue.service';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionQueueService: ProductionQueueService,
  ) {}
  async create(createProductionDto: CreateProductionDto) {
    try {
      const producedQuantity = createProductionDto.producedQuantity ?? 0;
      if (producedQuantity > createProductionDto.quantity) {
        throw new HttpException(
          'A quantidade produzida não pode ser maior que a quantidade planejada',
          HttpStatus.BAD_REQUEST,
        );
      }
      const dateStart = createProductionDto.dateStart
        ? new Date(createProductionDto.dateStart)
        : new Date();
      const dateEnd = createProductionDto.dateEnd
        ? new Date(createProductionDto.dateEnd)
        : await this.productionQueueService.finishDateFor(
            createProductionDto.idTransformationWorkshop,
            createProductionDto.idProduct,
            createProductionDto.quantity,
          );

      const createProduction = await this.prisma.production.create({
        data: {
          quantity: createProductionDto.quantity,
          produced_quantity: producedQuantity,
          date_start: dateStart,
          date_end: dateEnd,
          production_status:
            producedQuantity === createProductionDto.quantity
              ? 'DONE'
              : (createProductionDto.productionStatus ?? 'QUEUED'),
          product: { connect: { id: createProductionDto.idProduct } },
          transformation_workshop: {
            connect: { id: createProductionDto.idTransformationWorkshop },
          },
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
        production_status: true,
        quantity: true,
        produced_quantity: true,
        createdAt: true,
        updatedAt: true,
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
            ...(rest.productionStatus !== undefined
              ? { production_status: rest.productionStatus }
              : {}),
            ...(rest.quantity !== undefined
              ? { quantity: Number(rest.quantity) }
              : {}),
            ...(rest.idProduct !== undefined
              ? { product_fk: Number(rest.idProduct) }
              : {}),
            ...(rest.idTransformationWorkshop !== undefined
              ? {
                  transformation_workshop_fk: Number(
                    rest.idTransformationWorkshop,
                  ),
                }
              : {}),
          };

      const [data, total] = await Promise.all([
        this.prisma.production.findMany({
          skip,
          take: limit,
          select: {
            ...selectInfo,
            product: true,
            transformation_workshop: true,
            order_item: {
              select: {
                id: true,
                order_service: {
                  select: {
                    id: true,
                    uid: true,
                    status: true,
                    estimated_ready_at: true,
                    order: {
                      select: {
                        id: true,
                        uid: true,
                        sale_type: true,
                        createdAt: true,
                        user: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          where: filters,
          orderBy: [{ production_status: 'asc' }, { date_end: 'asc' }],
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
      include: {
        product: true,
        transformation_workshop: true,
        order_item: {
          include: {
            order_service: {
              include: { order: { include: { user: true } } },
            },
          },
        },
      },
    });

    if (!production) {
      throw new HttpException('Production not found', HttpStatus.NOT_FOUND);
    }

    return production;
  }

  async update(id: number, updateProductionDto: UpdateProductionDto) {
    try {
      const production = await this.findOne(id);

      const quantity = updateProductionDto.quantity ?? production.quantity;
      const producedQuantity =
        updateProductionDto.producedQuantity ?? production.produced_quantity;

      if (producedQuantity > quantity) {
        throw new HttpException(
          'A quantidade produzida não pode ser maior que a quantidade planejada',
          HttpStatus.BAD_REQUEST,
        );
      }

      const productionStatus =
        producedQuantity === quantity
          ? 'DONE'
          : updateProductionDto.productionStatus === 'CANCELLED'
            ? 'CANCELLED'
            : producedQuantity > 0
              ? 'IN_PROGRESS'
              : 'QUEUED';

      const updatedProduction = await this.prisma.production.update({
        where: {
          id,
        },
        data: {
          date_start: updateProductionDto.dateStart,
          date_end: updateProductionDto.dateEnd,
          quantity,
          produced_quantity: producedQuantity,
          production_status: productionStatus,
          product: {
            connect: {
              id: updateProductionDto.idProduct ?? production.product_fk,
            },
          },
          transformation_workshop: {
            connect: {
              id:
                updateProductionDto.idTransformationWorkshop ??
                production.transformation_workshop_fk,
            },
          },
        },
      });

      if (
        production.order_item?.order_service?.id &&
        ['IN_PROGRESS', 'DONE'].includes(productionStatus)
      ) {
        await this.prisma.order_service.update({
          where: { id: production.order_item.order_service.id },
          data: { status: 'IN_PRODUCTION' },
        });
      }

      return updatedProduction;
    } catch (err) {
      if (err instanceof HttpException) throw err;
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
