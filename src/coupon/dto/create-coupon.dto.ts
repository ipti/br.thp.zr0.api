import { CouponType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsEnum(CouponType)
  discount_type: CouponType;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_value?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_uses?: number;

  @IsOptional()
  expires_at?: Date;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
