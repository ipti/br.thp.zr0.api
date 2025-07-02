import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { InventoryService } from './shared/inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { InventoryResponse } from './doc/inventory.response';

@Controller('inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) { }

  @Post()
  @ApiCreatedResponse({ type: InventoryResponse })
  async create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  @ApiOkResponse({ type: [InventoryResponse] })
  async findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':transformation_workshop_fk/:product_fk')
  @ApiOkResponse({ type: [InventoryResponse] })
  async findOne(@Param('transformation_workshop_fk') transformationWorkshopFk: string,
    @Param('product_fk') productFk: string) {
    return this.inventoryService.findOne(+transformationWorkshopFk,
      +productFk);
  }

  @Patch(':transformation_workshop_fk/:product_fk')
  @ApiOkResponse({ type: InventoryResponse })
  async update(
    @Param('transformation_workshop_fk') transformationWorkshopFk: string,
    @Param('product_fk') productFk: string,
    @Body() updateInventoryDto: UpdateInventoryDto
  ) {
    return this.inventoryService.update(
      +transformationWorkshopFk,
      +productFk,
      updateInventoryDto
    );
  }

  @Delete(':transformation_workshop_fk/:product_fk')
  async remove(
    @Param('transformation_workshop_fk') transformationWorkshopFk: string,
    @Param('product_fk') productFk: string
  ) {
    return this.inventoryService.remove(
      +transformationWorkshopFk,
      +productFk);
  }
}
