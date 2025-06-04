import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { QueryProductVariantDto } from '../dto/query-product-variant.dto';
import { UpdateProductVariantDto } from '../dto/update-product-variant.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';

@Injectable()
export class ProductVariantService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createProductVariantDto: CreateProductVariantDto) {
    try {
      const createProductVariant = await this.prisma.product_variant.create({
        data: {
          name: createProductVariantDto.name,
          price: createProductVariantDto.price,
          amount: createProductVariantDto.amount,
          product: { connect: { id: createProductVariantDto.idProduct } },
        },
      });

      return createProductVariant;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryProductVariantDto) {
    try {
      const selectInfo = {
        id: true,
        name: true,
        amount: true,
        price: true,
      };
      const filters = isEmpty(query) ? {} : { ...query };

      return await this.prisma.product_variant.findMany({
        select: { ...selectInfo, product: true },
        where: filters,
      });
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
      throw new HttpException(
        'Erro ao buscar produtos.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(id: number) {
    const productVariant = await this.prisma.product_variant.findUnique({
      where: { id: id },
    });

    if (!productVariant) {
      throw new HttpException('Product Variant not found', HttpStatus.NOT_FOUND);
    }

    return productVariant;
  }

  async update(id: number, updateProductVariantDto: UpdateProductVariantDto) {
    try {
      const productVariant = await this.findOne(id);

      if (!productVariant) {
        throw new HttpException('Product Variant not found', HttpStatus.NOT_FOUND);
      }

      const updatedProductVariant = await this.prisma.product_variant.update({
        where: {
          id,
        },
        data: { ...updateProductVariantDto },
      });

      return updatedProductVariant;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const productVariant = await this.findOne(+id);
      if (!productVariant) {
        throw new HttpException('Product Variant not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.product_variant.delete({
        where: { id: productVariant.id },
      });

      return { message: 'Product Variant deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

}
