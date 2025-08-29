import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductBffService } from './shared/product_bff.service';

@ApiTags('Product-Bff')
@Controller('product-bff')
export class ProductBffController {
  constructor(private readonly productBffService: ProductBffService) { }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productBffService.QuantProducts(id);
  }

  @Get('uid/:uidProduct')
  findOneUid(@Param('uidProduct') uidProduct: string) {
    return this.productBffService.QuantProductsUid(uidProduct);
  }

  @Get('quantity/:uidProduct')
  findOneQuantity(@Param('uidProduct') uidProduct: string) {
    return this.productBffService.OnlyQuantProducts(uidProduct);
  }
}
