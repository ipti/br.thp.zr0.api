import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateCouponDto) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can create coupons');
    }

    return this.couponService.create(dto);
  }

  @Get('validate/:code')
  validate(@Param('code') code: string, @Query('orderTotal') orderTotal?: string) {
    return this.couponService.validateCoupon(
      code,
      orderTotal ? Number(orderTotal) : undefined,
    );
  }
}
