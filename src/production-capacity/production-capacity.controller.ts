import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { ProductionCapacityService } from './shared/production-capacity.service';
import { CreateProductionCapacityDto } from './dto/create-production-capacity.dto';
import { UpdateProductionCapacityDto } from './dto/update-production-capacity.dto';
import { QueryProductionCapacityDto } from './dto/query-production-capacity.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProductionCapacityResponse } from './doc/production-capacity.response';

@Controller('production-capacity')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class ProductionCapacityController {
  constructor(
    private readonly productionCapacityService: ProductionCapacityService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: ProductionCapacityResponse })
  async create(@Body() createProductionCapacityDto: CreateProductionCapacityDto) {
    return this.productionCapacityService.create(createProductionCapacityDto);
  }

  @Get()
  @ApiOkResponse({ type: [ProductionCapacityResponse] })
  async findAll(@Query() query: QueryProductionCapacityDto) {
    return this.productionCapacityService.findAll(query);
  }

  @Get(':transformation_workshop_fk/:product_fk')
  @ApiOkResponse({ type: ProductionCapacityResponse })
  async findOne(
    @Param('transformation_workshop_fk') transformationWorkshopFk: string,
    @Param('product_fk') productFk: string,
  ) {
    return this.productionCapacityService.findOne(
      +transformationWorkshopFk,
      +productFk,
    );
  }

  @Patch(':transformation_workshop_fk/:product_fk')
  @ApiOkResponse({ type: ProductionCapacityResponse })
  async update(
    @Param('transformation_workshop_fk') transformationWorkshopFk: string,
    @Param('product_fk') productFk: string,
    @Body() updateProductionCapacityDto: UpdateProductionCapacityDto,
  ) {
    return this.productionCapacityService.update(
      +transformationWorkshopFk,
      +productFk,
      updateProductionCapacityDto,
    );
  }

  @Delete(':transformation_workshop_fk/:product_fk')
  async remove(
    @Param('transformation_workshop_fk') transformationWorkshopFk: string,
    @Param('product_fk') productFk: string,
  ) {
    return this.productionCapacityService.remove(
      +transformationWorkshopFk,
      +productFk,
    );
  }
}
