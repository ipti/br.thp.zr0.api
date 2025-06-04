import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { ProductVariantService } from './shared/product-variant.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { QueryProductVariantDto } from './dto/query-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProductVariantResponse } from './doc/product-variant.response'


@Controller('product-variant')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class ProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) { }

  @Post()
  @ApiCreatedResponse({ type: ProductVariantResponse })
  async create(@Body() createProductVariantDto: CreateProductVariantDto) {
    return this.productVariantService.create(createProductVariantDto);
  }

  @Get()
  @ApiOkResponse({ type: [ProductVariantResponse] })
  async findAll(@Query() query: QueryProductVariantDto) {
    return this.productVariantService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: [ProductVariantResponse] })
  async getById(@Param('id') id: string) {
    return this.productVariantService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductVariantResponse })
  async update(@Param('id') id: string, @Body() updateProductVariantDto: UpdateProductVariantDto) {
    return this.productVariantService.update(+id, updateProductVariantDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productVariantService.remove(+id);
  }
}
