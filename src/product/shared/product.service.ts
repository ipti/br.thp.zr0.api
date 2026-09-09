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

  private normalizeCategoryKey(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async resolveCategoryId(category?: string) {
    if (!category) {
      return undefined;
    }

    const numericCategory = Number(category);
    if (Number.isInteger(numericCategory) && numericCategory > 0) {
      return numericCategory;
    }

    const normalizedCategory = this.normalizeCategoryKey(category);
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });

    const matchedCategory = categories.find(
      (item) => this.normalizeCategoryKey(item.name) === normalizedCategory,
    );

    return matchedCategory?.id;
  }

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
    const { page = 1, limit = 20, q, categoryId, category, sort, ...rest } = query;
    const skip = (page - 1) * limit;
    const selectInfo = {
      id: true,
      name: true,
      description: true,
      price: true,
      uid: true,
    };
    const filters: any = {
      deletedAt: null,
      ...(isEmpty(rest) ? {} : { ...rest }),
    };

    if (q) {
      filters.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const resolvedCategoryId = categoryId ? Number(categoryId) : await this.resolveCategoryId(category);

    if (resolvedCategoryId) {
      filters.category_fk = resolvedCategoryId;
    }

    const orderBy: any =
      sort === 'price_asc'  ? { price: 'asc' } :
      sort === 'price_desc' ? { price: 'desc' } :
      sort === 'name_asc'   ? { name: 'asc' } :
      { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        select: {
          ...selectInfo,
          category: true,
          product_image: true,
          product_review: {
            select: { rating: true },
          },
        },
        where: filters,
        orderBy,
      }),
      this.prisma.product.count({ where: filters }),
    ]);

    const productIds = data.map((product) => product.id);

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

    return {
      data: data.map((product) => {
        const reviewCount = product.product_review.length;
        const averageRating = reviewCount
          ? product.product_review.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount
          : 0;
        const { product_review, ...rest } = product;
        const quantity =
          (inventoryByProduct.get(product.id) ?? 0) -
          (reservedByProduct.get(product.id) ?? 0);

        return {
          ...rest,
          reviewCount,
          averageRating,
          quantity,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: id },
      include: {
        product_image: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    return product;
  }

  async findOneUid(uid: string) {
    const product = await this.prisma.product.findFirst({
      where: { uid: uid, deletedAt: null },
      select: {
        name: true,
        uid: true,
        description: true,
        createdAt: true,
        price: true,
        product_image: true,
        id: true,
        product_review: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const reviewCount = product.product_review.length;
    const averageRating = reviewCount
      ? product.product_review.reduce((sum, review) => sum + review.rating, 0) /
        reviewCount
      : 0;

    return {
      ...product,
      reviewCount,
      averageRating,
    };
  }

  async createReview(uid: string, userId: number, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) {
      throw new HttpException('A nota deve estar entre 1 e 5', HttpStatus.BAD_REQUEST);
    }

    const product = await this.prisma.product.findFirst({
      where: { uid, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      throw new HttpException('Produto não encontrado', HttpStatus.NOT_FOUND);
    }

    const hasBought = await this.prisma.order_item.findFirst({
      where: {
        product_fk: product.id,
        order_service: {
          status: 'COMPLETED',
          order: {
            user_fk: userId,
            payment_status: 'PAID',
          },
        },
      },
      select: { id: true },
    });

    if (!hasBought) {
      throw new HttpException(
        'A avaliação fica disponível em Minhas compras após o recebimento do produto',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.prisma.product_review.upsert({
      where: {
        product_fk_user_fk: {
          product_fk: product.id,
          user_fk: userId,
        },
      },
      update: {
        rating,
        comment: comment?.trim() || null,
      },
      create: {
        product: { connect: { id: product.id } },
        user: { connect: { id: userId } },
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getReviews(uid: string, page = 1, limit = 10) {
    const product = await this.prisma.product.findFirst({
      where: { uid, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      throw new HttpException('Produto não encontrado', HttpStatus.NOT_FOUND);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product_review.findMany({
        where: { product_fk: product.id },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product_review.count({ where: { product_fk: product.id } }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteReview(uid: string, reviewId: number) {
    const product = await this.prisma.product.findFirst({
      where: { uid },
      select: { id: true },
    });

    if (!product) {
      throw new HttpException('Produto não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.prisma.product_review.deleteMany({
      where: {
        id: reviewId,
        product_fk: product.id,
      },
    });

    return { removed: true };
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

      await this.prisma.product.update({
        where: { id: product.id },
        data: { deletedAt: new Date() },
      });

      return { message: 'Product deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
