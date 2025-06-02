import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ProductVariantService } from './shared/product-variant.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProductVariantResponse } from './doc/productVariant.response'


@Controller('product-variant')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class ProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) { }

  @Post()
  @ApiCreatedResponse({ type: ProductVariantResponse })
  create(@Body() createProductVariantDto: CreateProductVariantDto) {
    return this.productVariantService.create(createProductVariantDto);
  }

  @Get()
  findAll() {
    return this.productVariantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productVariantService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductVariantDto: UpdateProductVariantDto) {
    return this.productVariantService.update(+id, updateProductVariantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productVariantService.remove(+id);
  }
}
