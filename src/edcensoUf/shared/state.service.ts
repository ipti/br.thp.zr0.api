import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { isEmpty } from 'class-validator';
import includeQuery from 'src/utils/includeQuery';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStateDto } from '../dto/create-state.dto';
import { QueryStateDto } from '../dto/query-state.dto';
import { UpdateStateDto } from '../dto/update-state.dto';

@Injectable()
export class stateService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Documentation for this method (includes)
  // EXAMPLE OF INCLUDES: {"edcenso_city": true}
  async findAll(query: QueryStateDto, include?: string) {
    const filters = isEmpty(query) ? {} : { ...query };

    const includers = includeQuery(include, 'state')

    return this.prisma.state.findMany({
      where: filters,
      include: {
        city: true
      },
    });
  }

  async findOne(id: number) {
    const state = await this.prisma.state.findUnique({
      where: { id },
    });

    if (!state) {
      throw new HttpException('State not found', HttpStatus.NOT_FOUND);
    }

    return state;
  }

  async create(state: CreateStateDto) {
    return this.prisma.state.create({
      data: state,
    });
  }

  async update(id: number, updatestate: UpdateStateDto) {
    const state = await this.findOne(id);
    if (!state) {
      throw new HttpException('State not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.state.update({
      where: { id },
      data: updatestate,
    });
  }

  async delete(id: number) {
    return this.prisma.state.delete({
      where: { id },
    });
  }
}
