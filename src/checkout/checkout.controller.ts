import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
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
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  releaseExpired() {
    return this.checkoutService.releaseExpiredReservations();
  }
}
