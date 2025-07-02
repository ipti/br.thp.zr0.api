import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateInventoryDto } from '../dto/create-inventory.dto';
import { UpdateInventoryDto } from '../dto/update-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';
import { QueryInventoryDto } from '../dto/query-inventory.dto'

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createInventoryDto: CreateInventoryDto) {
    try {
      const createInventory = await this.prisma.inventory.create({
        data: {
          product: { connect: { id: createInventoryDto.idProduct } },
          transformation_workshop: { connect: { id: createInventoryDto.idTransformationWorkshop } },
          quantity: createInventoryDto.quantity,
        }
      });
      return createInventory;

    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryInventoryDto) {
    try {
      const selectInfo = {
        id: true,
        quantity: true
      };

      const filters = isEmpty(query) ? {} : { ...query };

      return await this.prisma.inventory.findMany({
        select: { ...selectInfo, product: true, transformation_workshop: true },
        where: filters,
      });

    } catch (err) {
      console.error('Erro ao buscar estoque:', err);
      throw new HttpException(
        'Erro ao buscar estoque.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(transformation_workshop_fk: number,
    product_fk: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        transformation_workshop_fk_product_fk: {
          transformation_workshop_fk,
          product_fk,
        },
      },
    });

    if (!inventory) {
      throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
    }

    return inventory;
  }

  async update(
    transformation_workshop_fk: number,
    product_fk: number,
    updateInventoryDto: UpdateInventoryDto
  ) {
    try {
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
      });

      if (!inventory) {
        throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
      }

      if (
        updateInventoryDto.quantity !== undefined &&
        updateInventoryDto.quantity < inventory.quantity
      ) {
        const difference = inventory.quantity - updateInventoryDto.quantity;

        if (difference > inventory.quantity) {
          throw new HttpException('Not enough inventory to reduce', HttpStatus.BAD_REQUEST);
        }
      }

      const quantityToAdd = updateInventoryDto.quantity ?? 0;
      const newQuantity = inventory.quantity + quantityToAdd;

      const updatedInventory = await this.prisma.inventory.update({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
        data: {
          ...updateInventoryDto,
          quantity: newQuantity
        },
      });

      return updatedInventory;

    } catch (err) {
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(transformation_workshop_fk: number,
    product_fk: number) {
    try {
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          },
        },
      });
      if (!inventory) {
        throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.inventory.delete({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk,
            product_fk,
          }
        }
      });

      return { message: 'Inventory deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
