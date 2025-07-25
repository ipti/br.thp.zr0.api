import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddProductTransformationWorkshopDto } from '../dto/transformation_workshop_product_add.dto';
import { ProductTransformationWorkshopUpdateDto } from '../dto/transformation_workshop_product_update.dto';

@Injectable()
export class TransformationWorkshopProductBffService {
  constructor(private readonly prisma: PrismaService) {}

  async transformationWorkshopProduct(twId: string) {
    try {
      const transformationWorkshopProduct =
        await this.prisma.transformation_workshop_product.findMany({
          where: {
            transformation_workshop_fk: +twId,
          },
          include: {
            product: true,
          },
        });

      return transformationWorkshopProduct;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async addProductTransformationWorkshop(
    addProductTransformationWorkshopDto: AddProductTransformationWorkshopDto,
  ) {
    try {
      const transformationWorkshopUserFind =
        await this.prisma.transformation_workshop_product.findFirst({
          where: {
            transformation_workshop_fk:
              addProductTransformationWorkshopDto.tw_fk,
            product_fk: addProductTransformationWorkshopDto.product_fk,
          },
        });

      if (transformationWorkshopUserFind) {
        throw new HttpException(
          'Produto já pertence a Oficina de Transformação!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transformation_workshop_product_create =
        await this.prisma.transformation_workshop_product.create({
          data: {
            product: {
              connect: { id: addProductTransformationWorkshopDto.product_fk },
            },
            transformation_workshop: {
              connect: { id: addProductTransformationWorkshopDto.tw_fk },
            },
            quantity: addProductTransformationWorkshopDto.quantity,
          },
        });

      return transformation_workshop_product_create;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateTransformationWorkshop(
    id: string,
    updateProductTransformationWorkshopDto: ProductTransformationWorkshopUpdateDto,
  ) {
    try {
      const transformationWorkshopUserFind =
        await this.prisma.transformation_workshop_product.findUnique({
          where: {
            id: +id,
          },
        });

      if (!transformationWorkshopUserFind) {
        throw new HttpException(
          'Produto não pertence a Oficina de Transformação!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transformation_workshop_product_update =
        await this.prisma.transformation_workshop_product.update({
          where: {
            id: +id,
          },
          data: {
            quantity: updateProductTransformationWorkshopDto.quantity,
          },
        });

      return transformation_workshop_product_update;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async removeProductTransformationWorkshop(id: string) {
    try {
      const relation =
        await this.prisma.transformation_workshop_product.findUnique({
          where: {
            id: +id,
          },
        });

      if (!relation) {
        throw new HttpException(
          'Produto não pertence à Oficina de transformação!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const deleted = await this.prisma.transformation_workshop_product.delete({
        where: {
          id: +id,
        },
      });

      return deleted;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
