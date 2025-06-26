import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { ProductionService } from './shared/production.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { ProductionResponse } from './doc/production.response';
import { QueryProductionDto } from './dto/query-production.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('production')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) { }

  @Post()
  @ApiCreatedResponse({ type: ProductionResponse })
  async create(@Body() createProductionDto: CreateProductionDto) {
    return this.productionService.create(createProductionDto);
  }

  @Get()
  @ApiOkResponse({ type: [ProductionResponse] })
  async findAll(@Query() query: QueryProductionDto) {
    return this.productionService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: [ProductionResponse] })
  async findOne(@Param('id') id: string) {
    return this.productionService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductionResponse })
  async update(@Param('id') id: string, @Body() updateProductionDto: UpdateProductionDto) {
    return this.productionService.update(+id, updateProductionDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productionService.remove(+id);
  }
}
