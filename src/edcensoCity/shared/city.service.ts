import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { isEmpty } from 'class-validator';
import { stateService } from 'src/edcensoUf/shared/state.service';
import { PrismaService } from '../../prisma/prisma.service';
import includeQuery from '../../utils/includeQuery';
import { QueryCityDto } from '../dto/query-city.dto';

@Injectable()
export class CityService {
  constructor(
    private readonly prisma: PrismaService,
    private stateService: stateService,
  ) {}

  async findAll(query: QueryCityDto, include?: string){
    const filters = isEmpty(query) ? {} : { ...query }; 

    const includers = includeQuery(include, 'city')

    return this.prisma.city.findMany({
      where: filters,
      include: includers,
    });
  }

  async findOne(id: number) {
    const edcensoCity = await this.prisma.city.findUnique({
      where: { id },
    });

    if (!edcensoCity) {
      throw new HttpException('City not found', HttpStatus.NOT_FOUND);
    }

    return edcensoCity;
  }
}
