import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ProductResponse } from './doc/product.response';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './shared/product.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Product')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiCreatedResponse({ type: ProductResponse })
  async create(@Body() userCreate: CreateProductDto) {
    return await this.productsService.create(userCreate);
  }

  @Get()
  @ApiOkResponse({ type: [ProductResponse] })
  async getAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: [ProductResponse] })
  async getById(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Put(':id')
  @ApiCreatedResponse({ type: ProductResponse })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() user: UpdateProductDto,
  ) {
    return this.productsService.update(+id, user);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.productsService.remove(id);
  }
}
