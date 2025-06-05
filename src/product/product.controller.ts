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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProductResponse } from './doc/product.response';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './shared/product.service';

@ApiTags('Product')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiCreatedResponse({ type: ProductResponse })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create product with files',
    type: CreateProductDto as any,
  })
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @Body() userCreate: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return await this.productsService.create(userCreate, files);
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
