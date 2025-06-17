import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { QueryCustomerDto } from '../dto/query-customer.dto'
import { isEmpty } from 'class-validator';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) { }
  async create(createCustomerDto: CreateCustomerDto) {
    try {
      const createCustomer = await this.prisma.customer.create({
        data: {
          cpf: createCustomerDto.cpf,
          cnpj: createCustomerDto.cnpj,
          phone: createCustomerDto.phone,
          corporate_name: createCustomerDto.corporate_name,
          trade_name: createCustomerDto.trade_name,
          birthday: createCustomerDto.birthday,
          user: { connect: { id: createCustomerDto.idUser } },
        },
      });

      return createCustomer;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryCustomerDto) {
    try {
      const selectInfo = {
        cpf: true,
        cnpj: true,
        birthday: true,
        phone: true,
        corporate_name: true,
        trade_name: true,
      }

      const filters = isEmpty(query) ? {} : { ...query };

      return this.prisma.customer.findMany({
        select: { ...selectInfo, user: true },
        where: filters,
      });
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      throw new HttpException(
        'Erro ao buscar clientes.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: id },
    });

    if (!customer) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    try {
      const customer = await this.findOne(id);

      if (!customer) {
        throw new HttpException('Costumer not found', HttpStatus.NOT_FOUND);
      }

      const updatedProductVariant = await this.prisma.customer.update({
        where: {
          id,
        },
        data: { ...updateCustomerDto },
      });

      return updatedProductVariant;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const customer = await this.findOne(+id);
      if (!customer) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.customer.delete({
        where: { id: customer.id },
      });

      return { message: 'Customer deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
