import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateProductionDto } from '../dto/create-production.dto';
import { UpdateProductionDto } from '../dto/update-production.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';
import { QueryProductionDto } from '../dto/query-production.dto';

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
      const selectInfo = {
        id: true,
        date_start: true,
        date_end: true,
        status: true,
        quantity: true,
      };
      const filters = isEmpty(query) ? {} : { ...query };

      return await this.prisma.production.findMany({
        select: { ...selectInfo, product: true, transformation_workshop: true },
        where: filters,
      });
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
          product: { connect: { id: updateProductionDto.idTransformationWorkshop ?? production.transformation_workshop_fk! } },
          transformation_workshop: { connect: { id: updateProductionDto.idProduct ?? production.product_fk! } },
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
