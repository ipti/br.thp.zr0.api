import { Controller, Post, Body } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingRequestDto } from './dto/shipping.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}
  @Post('calculate')
  calculateShipping(@Body() shippingDto: ShippingRequestDto) {
    return this.shippingService.calculate(shippingDto);
  }
}
