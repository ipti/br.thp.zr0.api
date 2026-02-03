import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';

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

  @IsNumber()
  @IsNotEmpty()
  id_order_service: number;

  @IsNumber()
  @IsNotEmpty()
  id_order: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  @IsOptional()
  items?: UpdateOrderItemDto[];
}
