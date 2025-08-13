import { Controller, Post, Body } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingRequestDto } from './dto/shipping.dto';
import { Shipping2Service } from './shipping2.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: Shipping2Service) {}
  @Post('calculate')
  calculateShipping(@Body() shippingDto: ShippingRequestDto) {
    return this.shippingService.calculate(shippingDto);
  }

}
