import { Body, Controller, Post } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateStockReservationDto } from './dto/create-checkout.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('reserve')
  reserve(@Body() body: CreateStockReservationDto) {
    return this.checkoutService.reserveStock(body);
  }

  @Post('release-expired')
  releaseExpired() {
    return this.checkoutService.releaseExpiredReservations();
  }
}
