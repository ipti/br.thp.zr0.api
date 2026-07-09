import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
@Controller('product')
export class ProductController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiCreatedResponse({ type: ProductResponse })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
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

  @Get(':uid/reviews')
  async getReviews(
    @Param('uid') uid: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getReviews(
      uid,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Post(':uid/review')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Req() req: any,
    @Param('uid') uid: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.productsService.createReview(
      uid,
      req.user.id,
      Number(body.rating),
      body.comment,
    );
  }

  @Delete(':uid/review/:reviewId')
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @Req() req: any,
    @Param('uid') uid: string,
    @Param('reviewId') reviewId: string,
  ) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete reviews');
    }

    return this.productsService.deleteReview(uid, Number(reviewId));
  }

  @Get(':id')
  @ApiOkResponse({ type: [ProductResponse] })
  async getById(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Get('get-uid/:uid')
  @ApiOkResponse({ type: [ProductResponse] })
  async getByUId(@Param('uid') uid: string) {
    return this.productsService.findOneUid(uid);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: ProductResponse })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() user: UpdateProductDto,
  ) {
    return this.productsService.update(+id, user);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    this.productsService.remove(id);
  }
}
