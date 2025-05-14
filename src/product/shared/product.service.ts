import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { isEmpty } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const createdProduct = await this.prisma.product.create({
        data: {
          name: createProductDto.name,
          description: createProductDto.description,
          price: createProductDto.price,
          category: { connect: { id: createProductDto.idCategory } },
        },
      });

      return createdProduct;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryProductDto) {
    const selectInfo = {
      id: true,
      name: true,
      description: true,
      price: true
    };
    const filters = isEmpty(query) ? {} : { ...query };

    return this.prisma.product.findMany({
      select: { ...selectInfo, category: true },
      where: filters,
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    try {
      const Product = await this.findOne(id);
      const updatedProduct = await this.prisma.product.update({
        where: {
          id,
        },
        data: { ...updateProductDto },
      });

      return updatedProduct;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: string) {
    try {
      const product = await this.findOne(+id);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.product.delete({
        where: { id: product.id },
      });

      return { message: 'Product deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
