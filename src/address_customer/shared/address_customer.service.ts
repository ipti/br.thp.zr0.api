import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAddressCustomerDto } from '../dto/create-address_customer.dto';
import { UpdateAddressCustomerDto } from '../dto/update-address_customer.dto';
import { QueryAddressCustomerDto } from '../dto/query-address_customer.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';

@Injectable()
export class AddressCustomerService {
  constructor(private readonly prisma: PrismaService) { }

  async create(CreateAddressCustomerDto: CreateAddressCustomerDto) {

    try {
      const createAddressCustomer = await this.prisma.address_customer.create({
        data: {
          cep: CreateAddressCustomerDto.cep,
          address: CreateAddressCustomerDto.address,
          number: CreateAddressCustomerDto.number,
          complement: CreateAddressCustomerDto.complement,
          neighborhood: CreateAddressCustomerDto.neighborhood,
          name: CreateAddressCustomerDto.name,
          phone: CreateAddressCustomerDto.phone,
          state: { connect: { id: CreateAddressCustomerDto.stateId } },
          city: { connect: { id: CreateAddressCustomerDto.cityId } },
          customer: { connect: { id: CreateAddressCustomerDto.customerId } },
        },
      });

      return createAddressCustomer;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryAddressCustomerDto) {
    try {
      const selectInfo = {
        id: true,
        cep: true,
        address: true,
        number: true,
        complement: true,
        neighborhood: true,
        name: true, 
        phone: true
      };
      const filters = isEmpty(query) ? {} : { ...query };

      return await this.prisma.address_customer.findMany({
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
    const AddressCustomer = await this.prisma.address_customer.findUnique({
      where: { id: id },
      include: { state: true, city: true },
    });

    if (!AddressCustomer) {
      throw new HttpException('Address Customer not found', HttpStatus.NOT_FOUND);
    }

    return AddressCustomer;
  }

  async update(id: number, UpdateAddressCustomerDto: UpdateAddressCustomerDto) {
    try {
      const AddressCustomer = await this.findOne(id);

      if (!AddressCustomer) {
        throw new HttpException('Billing Address Customer not found', HttpStatus.NOT_FOUND);
      }

      const updateAddressCustomer = await this.prisma.address_customer.update({
        where: {
          id,
        },
        data: {
          cep: UpdateAddressCustomerDto.cep,
          address: UpdateAddressCustomerDto.address,
          number: UpdateAddressCustomerDto.number,
          complement: UpdateAddressCustomerDto.complement,
          neighborhood: UpdateAddressCustomerDto.neighborhood,
          state: { connect: { id: UpdateAddressCustomerDto.stateId ?? AddressCustomer.state_fk! } },
          city: { connect: { id: UpdateAddressCustomerDto.cityId ?? AddressCustomer.city_fk! } },
        },
      });

      return updateAddressCustomer;
    } catch (err) {

      console.log(err)
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const AddressCustomer = await this.findOne(+id);
      if (!AddressCustomer) {
        throw new HttpException('Product Variant not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.address_customer.delete({
        where: { id: AddressCustomer.id },
      });

      return { message: 'Billing Address Customer deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
