import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export class UpdateOrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @IsOptional()
  variantId?: number;

  @IsNumber()
  quantity: number;
}

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsOptional()
  status?: OrderStatus; // Se você tiver um enum de status no modelo

  @IsString()
  @IsOptional()
  payment_status?: PaymentStatus; // Se você tiver um enum de status no modelo

  @IsIn(['PIX', 'CREDIT_CARD', 'BANK_SLIP'])
  @IsOptional()
  payment_method?: PaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  @IsOptional()
  items?: UpdateOrderItemDto[];
}
