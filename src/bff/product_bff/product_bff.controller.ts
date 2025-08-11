import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductBffService } from './shared/product_bff.service';

@ApiTags('Product-Bff')
@Controller('product-bff')
export class ProductBffController {
  constructor(
    private readonly productBffService: ProductBffService,
  ) { }



  @Get(':idProduct')
  findOne(@Param('idProduct') idProduct: string) {
    return this.productBffService.QuantProducts(
      +idProduct,
    );
  }


}
