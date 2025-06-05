import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  @IsOptional()
  items?: UpdateOrderItemDto[];
}
