import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCartDto } from '../dto/create-cart.dto';
import { UpdateCartDto } from '../dto/update-cart.dto';
import { QueryCartDto } from '../dto/query-cart.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCartDto: CreateCartDto) {
    try {
      const createCart = await this.prisma.cart.create({
        data: {
          customer: { connect: { id: createCartDto.idCustomer } },
          items: createCartDto.items
            ? {
                create: createCartDto.items.map((item) => ({
                  quantity: item.quantity,
                  product: { connect: { id: item.productId } },
                  ...(item.variantId
                    ? { variant: { connect: { id: item.variantId } } }
                    : {}),
                })),
              }
            : undefined,
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      return createCart;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query) {
    try {
      const selectInfo = {
        id: true
      };
      const filters = isEmpty(query) ? {} : { ...query };

      return await this.prisma.cart.findMany({
        select: {
          ...selectInfo,
          customer: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
        where: filters,
      });
    } catch (err) {
      console.error('Erro ao buscar carrinhos:', err);
      throw new HttpException(
        'Erro ao buscar carrinhos.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(id: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      throw new HttpException('Cart not found', HttpStatus.NOT_FOUND);
    }

    return cart;
  }

  async update(id: number, updateCartDto: UpdateCartDto) {
    try {
      const cart = await this.findOne(id);

      if (!cart) {
        throw new HttpException('Cart not found', HttpStatus.NOT_FOUND);
      }

      const updatedCart = await this.prisma.cart.update({
        where: {
          id,
        },
        data: {
          customer: { connect: { id: updateCartDto.idCustomer ?? cart.customer_fk! } },
          items: updateCartDto.items
            ? {
                deleteMany: {},
                create: updateCartDto.items.map((item) => ({
                  quantity: item.quantity,
                  product: { connect: { id: item.productId } },
                  ...(item.variantId
                    ? { variant: { connect: { id: item.variantId } } }
                    : {}),
                })),
              }
            : undefined,
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      return updatedCart;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const cart = await this.findOne(+id);
      if (!cart) {
        throw new HttpException('Cart not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.cart.delete({
        where: { id: cart.id },
      });

      return { message: 'Cart deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async getMyCart(userId: number) {
    return this.prisma.cart.findFirst({
      where: { customer: { user_fk: userId } },
      include: {
        items: {
          include: {
            product: {
              include: {
                product_image: true,
              },
            },
            variant: true,
          },
        },
      },
    });
  }

  async addItem(userId: number, item: CreateCartItemDto) {
    let cart = await this.prisma.cart.findFirst({
      where: { customer: { user_fk: userId } },
    });

    if (!cart) {
      const customer = await this.prisma.customer.findFirst({
        where: { user_fk: userId },
      });

      if (!customer) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      cart = await this.prisma.cart.create({
        data: {
          customer: { connect: { id: customer.id } },
        },
      });
    }

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cart_fk: cart.id,
        product_fk: item.productId,
        variant_fk: item.variantId ?? null,
      },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
        include: {
          product: { include: { product_image: true } },
          variant: true,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cart: { connect: { id: cart.id } },
        product: { connect: { id: item.productId } },
        quantity: item.quantity,
        ...(item.variantId ? { variant: { connect: { id: item.variantId } } } : {}),
      },
      include: {
        product: { include: { product_image: true } },
        variant: true,
      },
    });
  }

  async updateItem(userId: number, itemId: number, item: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { customer: { user_fk: userId } },
      },
    });

    if (!cartItem) {
      throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: item.quantity ?? cartItem.quantity,
        ...(item.variantId !== undefined
          ? item.variantId
            ? { variant: { connect: { id: item.variantId } } }
            : { variant: { disconnect: true } }
          : {}),
      },
      include: {
        product: { include: { product_image: true } },
        variant: true,
      },
    });
  }

  async removeItem(userId: number, itemId: number) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { customer: { user_fk: userId } },
      },
    });

    if (!cartItem) {
      throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Cart item deleted successfully' };
  }
}
