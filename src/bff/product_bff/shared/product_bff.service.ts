import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from '../../../product/shared/product.service';

@Injectable()
export class ProductBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductsService,
  ) {}

  async OnlyQuantProducts(uid: string) {
    try {
      const product = await this.productService.findOneUid(uid);

      const tw_product = await this.prisma.inventory.findMany({
        where: {
          product_fk: product.id,
        },
      });

      const reserved = await this.prisma.stock_reservation.aggregate({
        _sum: { quantity: true },
        where: {
          product_fk: product.id,
          expires_at: { gt: new Date() },
        },
      });

      const quantity =
        tw_product
          .map((item) => item.quantity)
          .reduce((prev, curr) => prev + curr, 0) -
        (reserved._sum.quantity ?? 0);

      return {
        quantity: quantity,
      };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async QuantProductsUid(uid: string) {
    try {
      const product = await this.productService.findOneUid(uid);

      const tw_product = await this.prisma.inventory.findMany({
        where: {
          product_fk: product.id,
        },
        include: {
          transformation_workshop: { include: { city: true, state: true } },
        },
      });

      const reserved = await this.prisma.stock_reservation.aggregate({
        _sum: { quantity: true },
        where: {
          product_fk: product.id,
          expires_at: { gt: new Date() },
        },
      });

      const quantity =
        tw_product
          .map((item) => item.quantity)
          .reduce((prev, curr) => prev + curr, 0) -
        (reserved._sum.quantity ?? 0);

      const productionCapacities = await this.prisma.production_capacity.findMany({
        where: { product_fk: product.id, active: true },
        include: {
          transformation_workshop: { include: { city: true, state: true } },
        },
      });

      const monthlyCapacity = productionCapacities.reduce(
        (sum, capacity) => sum + capacity.monthly_capacity,
        0,
      );
      const availableForOrder = monthlyCapacity > 0;

      const workshop =
        tw_product.find((item) => item.quantity > 0)?.transformation_workshop ??
        productionCapacities[0]?.transformation_workshop;

      const location = workshop
        ? [workshop.city?.name, workshop.state?.acronym]
            .filter(Boolean)
            .join(' - ')
        : null;

      return {
        id: product.id,
        name: product.name,
        uid: product.uid,
        description: product.description,
        createdAt: product.createdAt,
        price: product.price,
        product_image: product.product_image,
        quantity: quantity,
        averageRating: (product as any).averageRating ?? 0,
        reviewCount: (product as any).reviewCount ?? 0,
        product_review: (product as any).product_review ?? [],
        location,
        availableForOrder,
        monthlyCapacity,
      };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async QuantProducts(id: string) {
    try {
      const product = await this.productService.findOne(+id);

      const tw_product = await this.prisma.inventory.findMany({
        where: {
          product_fk: product.id,
        },
      });

      const reserved = await this.prisma.stock_reservation.aggregate({
        _sum: { quantity: true },
        where: {
          product_fk: product.id,
          expires_at: { gt: new Date() },
        },
      });

      const quantity =
        tw_product
          .map((item) => item.quantity)
          .reduce((prev, curr) => prev + curr, 0) -
        (reserved._sum.quantity ?? 0);

      return {
        ...product,
        quantity: quantity,
      };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
