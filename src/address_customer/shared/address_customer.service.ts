import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAddressCustomerDto } from '../dto/create-address_customer.dto';
import { UpdateAddressCustomerDto } from '../dto/update-address_customer.dto';
import { QueryAddressCustomerDto } from '../dto/query-address_customer.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { isEmpty } from 'class-validator';
import { UpdateDefaultAddressCustomerDto } from '../dto/update-default-address_customer.dto';

@Injectable()
export class AddressCustomerService {
  constructor(private readonly prisma: PrismaService) { }

  async create(CreateAddressCustomerDto: CreateAddressCustomerDto) {

    try {

      const transaction = await this.prisma.$transaction(async (tx) => {

        await tx.address_customer.updateMany({
          where: {
            customer_fk: CreateAddressCustomerDto.customerId,
            is_default: true,
          },
          data: {
            is_default: false,
          },
        })

        const createAddressCustomer = await tx.address_customer.create({
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

      });
      return transaction;

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

  async updateDefault(UpdateDefaultAddressCustomerDto: UpdateDefaultAddressCustomerDto) {
    try {


      const AddressCustomer = await this.findOne(UpdateDefaultAddressCustomerDto.addressId)
        ;

      if (!AddressCustomer) {
        throw new HttpException('Billing Address Customer not found', HttpStatus.NOT_FOUND);
      }

      const transaction = await this.prisma.$transaction(async (tx) => {

        await tx.address_customer.updateMany({
          where: {
            customer_fk: UpdateDefaultAddressCustomerDto.customerId,
            is_default: true,
          },
          data: {
            is_default: false,
          },
        })

        await tx.address_customer.update({
          where: {
            id: UpdateDefaultAddressCustomerDto.addressId,
          },
          data: {
            is_default: true,
          },
        })

        return { message: 'Endereço principal alterado com sucesso.' };

      });
      return transaction;


    } catch (err) {

      console.log(err)
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number, customerId: number) {
    try {
      const AddressCustomer = await this.findOne(+id);
      if (!AddressCustomer) {
        throw new HttpException('Product Variant not found', HttpStatus.NOT_FOUND);
      }


      const transaction = await this.prisma.$transaction(async (tx) => {
        const addressCustomerList = await tx.address_customer.findMany({
          where: {
            customer_fk: customerId,
          },
        })

        if (AddressCustomer.is_default && addressCustomerList.length > 1) {
          const address = addressCustomerList.filter(item => item.id !== AddressCustomer.id)
          if (address[0]) {
            await tx.address_customer.update({
              where: {
                id: address[0].id
              },
              data: {
                is_default: true
              }
            })
          }
        }


        if (addressCustomerList.length <= 1) {
          throw new HttpException('O cliente deve ter pelo menos um endereço', HttpStatus.BAD_REQUEST);
        }

        await tx.address_customer.delete({
          where: { id: AddressCustomer.id },
        });

        return { message: 'Billing Address Customer deleted successfully' };
      })

      return transaction

    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
