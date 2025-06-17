import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateBillingAddressCustomerDto } from '../dto/create-billing_address_customer.dto';
import { UpdateBillingAddressCustomerDto } from '../dto/update-billing_address_customer.dto';
import { QueryBillingAddressCustomerDto } from '../dto/query-billing_address_customer.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';

@Injectable()
export class BillingAddressCustomerService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createBillingAddressCustomerDto: CreateBillingAddressCustomerDto) {

    try {
      const createBillingAddressCustomer = await this.prisma.billing_address_customer.create({
        data: {
          cep: createBillingAddressCustomerDto.cep,
          address: createBillingAddressCustomerDto.address,
          number: createBillingAddressCustomerDto.number,
          complement: createBillingAddressCustomerDto.complement,
          neighborhood: createBillingAddressCustomerDto.neighborhood,
          state: { connect: { id: createBillingAddressCustomerDto.stateId } },
          city: { connect: { id: createBillingAddressCustomerDto.cityId } },
          customer: { connect: { id: createBillingAddressCustomerDto.customerId } },
        },
      });

      return createBillingAddressCustomer;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryBillingAddressCustomerDto) {
    try {
      const selectInfo = {
        id: true,
        cep: true,
        address: true,
        number: true,
        complement: true,
        neighborhood: true,
      };
      const filters = isEmpty(query) ? {} : { ...query };

      return await this.prisma.billing_address_customer.findMany({
        select: { ...selectInfo, customer: true, state: true, city: true },
        where: filters,
      });
    } catch (err) {
      console.error('Erro ao buscar os endereços:', err);
      throw new HttpException(
        'Erro ao buscar o endereços.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(id: number) {
    const billingAddressCustomer = await this.prisma.billing_address_customer.findUnique({
      where: { id: id },
    });

    if (!billingAddressCustomer) {
      throw new HttpException('Billing Address Customer not found', HttpStatus.NOT_FOUND);
    }

    return billingAddressCustomer;
  }

  async update(id: number, updateBillingAddressCustomerDto: UpdateBillingAddressCustomerDto) {
    try {
      const billingAddressCustomer = await this.findOne(id);

      if (!billingAddressCustomer) {
        throw new HttpException('Billing Address Customer not found', HttpStatus.NOT_FOUND);
      }

      const updateBillingAddressCustomer = await this.prisma.billing_address_customer.update({
        where: {
          id,
        },
        data: {
          cep: updateBillingAddressCustomerDto.cep,
          address: updateBillingAddressCustomerDto.address,
          number: updateBillingAddressCustomerDto.number,
          complement: updateBillingAddressCustomerDto.complement,
          neighborhood: updateBillingAddressCustomerDto.neighborhood,
          state: { connect: { id: updateBillingAddressCustomerDto.stateId ?? billingAddressCustomer.state_fk! } },
          city: { connect: { id: updateBillingAddressCustomerDto.cityId ?? billingAddressCustomer.city_fk! } },
        },
      });

      return updateBillingAddressCustomer;
    } catch (err) {

      console.log(err)
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const billingAddressCustomer = await this.findOne(+id);
      if (!billingAddressCustomer) {
        throw new HttpException('Product Variant not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.billing_address_customer.delete({
        where: { id: billingAddressCustomer.id },
      });

      return { message: 'Billing Address Customer deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
