import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

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

  findAll() {
    return `This action returns all customer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} customer`;
  }

  update(id: number, updateCustomerDto: UpdateCustomerDto) {
    return `This action updates a #${id} customer`;
  }

  remove(id: number) {
    return `This action removes a #${id} customer`;
  }
}
