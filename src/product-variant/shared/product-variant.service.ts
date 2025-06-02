import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { UpdateProductVariantDto } from '../dto/update-product-variant.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductVariantService {
   constructor(private readonly prisma: PrismaService) {}
  
  async create(createProductVariantDto: CreateProductVariantDto) {
     try {
      const createProductVariant = await this.prisma.product_variant.create({
        data: {
          name: createProductVariantDto.name,
          price: createProductVariantDto.price,
          amount : createProductVariantDto.amount,
          product: { connect: { id: createProductVariantDto.idProduct } },
        },
      });

      return createProductVariant;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  findAll() {
    return `This action returns all productVariant`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productVariant`;
  }

  update(id: number, updateProductVariantDto: UpdateProductVariantDto) {
    return `This action updates a #${id} productVariant`;
  }

  remove(id: number) {
    return `This action removes a #${id} productVariant`;
  }
}
