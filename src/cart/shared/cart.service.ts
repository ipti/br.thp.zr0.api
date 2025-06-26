import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCartDto } from '../dto/create-cart.dto';
import { UpdateCartDto } from '../dto/update-cart.dto';
import { QueryCartDto } from '../dto/query-cart.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCartDto: CreateCartDto) {
    try {
      const createCart = await this.prisma.cart.create({
        data: {
          customer: { connect: { id: createCartDto.idCustomer } },
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
        select: { ...selectInfo, customer: true },
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
}
