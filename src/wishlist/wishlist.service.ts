import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: number, productUid: string) {
    const product = await this.prisma.product.findFirst({
      where: { uid: productUid, deletedAt: null },
    });

    if (!product) {
      throw new HttpException('Produto não encontrado', HttpStatus.NOT_FOUND);
    }

    return this.prisma.wishlist_item.upsert({
      where: {
        user_fk_product_fk: {
          user_fk: userId,
          product_fk: product.id,
        },
      },
      update: {},
      create: {
        user: { connect: { id: userId } },
        product: { connect: { id: product.id } },
      },
    });
  }

  async remove(userId: number, productUid: string) {
    const product = await this.prisma.product.findFirst({
      where: { uid: productUid },
    });

    if (!product) {
      throw new HttpException('Produto não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.prisma.wishlist_item.deleteMany({
      where: {
        user_fk: userId,
        product_fk: product.id,
      },
    });

    return { removed: true };
  }

  async list(userId: number) {
    const items = await this.prisma.wishlist_item.findMany({
      where: { user_fk: userId, product: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            category: true,
            product_image: true,
          },
        },
      },
    });

    const productIds = items.map((item) => item.product.id);

    const [inventoryAgg, reservedAgg] = productIds.length
      ? await Promise.all([
          this.prisma.inventory.groupBy({
            by: ['product_fk'],
            where: { product_fk: { in: productIds } },
            _sum: { quantity: true },
          }),
          this.prisma.stock_reservation.groupBy({
            by: ['product_fk'],
            where: {
              product_fk: { in: productIds },
              expires_at: { gt: new Date() },
            },
            _sum: { quantity: true },
          }),
        ])
      : [[], []];

    const inventoryByProduct = new Map(
      inventoryAgg.map((item) => [item.product_fk, item._sum.quantity ?? 0]),
    );
    const reservedByProduct = new Map(
      reservedAgg.map((item) => [item.product_fk, item._sum.quantity ?? 0]),
    );

    return items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        quantity:
          (inventoryByProduct.get(item.product.id) ?? 0) -
          (reservedByProduct.get(item.product.id) ?? 0),
      },
    }));
  }

  async check(userId: number, productUid: string) {
    const product = await this.prisma.product.findFirst({
      where: { uid: productUid },
      select: { id: true },
    });

    if (!product) {
      return { wished: false };
    }

    const item = await this.prisma.wishlist_item.findUnique({
      where: {
        user_fk_product_fk: {
          user_fk: userId,
          product_fk: product.id,
        },
      },
    });

    return { wished: !!item };
  }
}
