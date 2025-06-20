import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { isEmpty } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AzureProviderService } from 'src/utils/middleware/azure.provider';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly azureService: AzureProviderService,
  ) {}

  async create(createProductDto: CreateProductDto, file) {
    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            name: createProductDto.name,
            description: createProductDto.description,
            price: +createProductDto.price,
            category: { connect: { id: +createProductDto.idCategory } },
            height: +createProductDto.height,
            length: +createProductDto.length,
            width: +createProductDto.width,
            weight: +createProductDto.weight,
          },
        });

        if (file) {
          for (const i of file) {
            const fileAzure = await this.azureService.uploadFile(
              i,
              'image-product',
            );
            if (fileAzure) {
              await tx.product_image.create({
                data: {
                  img_url: fileAzure,
                  product: { connect: { id: createdProduct.id } },
                },
              });
            }
          }
        }
        return createdProduct;
      });
      return transaction;
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
      price: true,
    };
    const filters = isEmpty(query) ? {} : { ...query };

    return this.prisma.product.findMany({
      select: { ...selectInfo, category: true, product_image: true },
      where: filters,
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: id },
      include: {
        product_image: true
      }
    });

    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    try {
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
