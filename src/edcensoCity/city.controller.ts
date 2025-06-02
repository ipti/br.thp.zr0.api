import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiTags
} from '@nestjs/swagger';
import { CityResponse } from './doc/cinty.response';
import { QueryCityDto } from './dto/query-city.dto';
import { CityService } from './shared/city.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('city')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
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
