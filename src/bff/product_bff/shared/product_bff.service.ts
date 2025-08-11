import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from '../../../product/shared/product.service';

@Injectable()
export class ProductBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductsService,
  ) {}

  async QuantProducts(id: number) {
    try {
      const product = await this.productService.findOne(id);

      const tw_product =
        await this.prisma.transformation_workshop_product.findMany({
          where: {
            product_fk: id,
          },
        });

      const quantity = tw_product
        .map((item) => item.quantity)
        .reduce((prev, curr) => prev + curr, 0);

      return { ...product, quantity: quantity };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
