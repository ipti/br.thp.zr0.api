import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// dto/create-order.dto.ts
export class CreateOrderDto {
  customerId: number;
  destinationZipCode: string;
  workshopId: number;
  orderItems: {
    productId: number;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
}

export class StockReservationItemDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  workshopId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateStockReservationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockReservationItemDto)
  items: StockReservationItemDto[];
}
