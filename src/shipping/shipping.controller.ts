import { Body, Controller, Post } from '@nestjs/common';
import { ShippingRequestDto } from './dto/shipping.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}
  @Post('calculate')
  calculateShipping(@Body() shippingDto: ShippingRequestDto) {
    return this.shippingService.calculate(shippingDto);
  }

}
