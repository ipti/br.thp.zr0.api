import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CouponType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        discount_type: dto.discount_type,
        discount_value: dto.discount_value,
        min_order_value: dto.min_order_value,
        max_uses: dto.max_uses,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
        active: dto.active ?? true,
      },
    });
  }

  async validateCoupon(code: string, orderTotal?: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.active) {
      throw new HttpException('Cupom inválido', HttpStatus.NOT_FOUND);
    }

    if (coupon.expires_at && coupon.expires_at < new Date()) {
      throw new HttpException('Cupom expirado', HttpStatus.BAD_REQUEST);
    }

    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      throw new HttpException('Cupom sem usos disponíveis', HttpStatus.BAD_REQUEST);
    }

    if (
      coupon.min_order_value &&
      typeof orderTotal === 'number' &&
      orderTotal < coupon.min_order_value
    ) {
      throw new HttpException(
        `Cupom disponível apenas para pedidos acima de R$ ${coupon.min_order_value.toFixed(2)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const discount = this.calculateDiscount(coupon.discount_type, coupon.discount_value, orderTotal ?? 0);

    return {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      discount,
    };
  }

  calculateDiscount(type: CouponType, value: number, orderTotal: number) {
    if (type === 'PERCENT') {
      return Math.min(orderTotal, Number(((orderTotal * value) / 100).toFixed(2)));
    }

    return Math.min(orderTotal, value);
  }
}
