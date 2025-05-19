import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags
} from '@nestjs/swagger';
import { CityResponse } from './doc/cinty.response';
import { QueryCityDto } from './dto/query-city.dto';
import { CityService } from './shared/city.service';

@Controller('city')
@ApiTags('City')
export class CityController {
  constructor(private CityService: CityService) {}

  @Get()
  @ApiCreatedResponse({ type: [CityResponse] })
  async getAll(
    @Query() query: QueryCityDto,
    @Query('include') include: string,
  ) {
    return this.CityService.findAll(query, include);
  }

  @Get(':id')
  @ApiOkResponse({ type: CityResponse })
  async getById(@Param('id') id: string) {
    return this.CityService.findOne(+id);
  }
}
