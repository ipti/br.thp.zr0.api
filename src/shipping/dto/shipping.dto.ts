import {
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
  Min,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsNumber()
  @Min(1)
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ShippingRequestDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems: OrderItemDto[];

  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'Invalid Brazilian CEP format (expected 12345-678)',
  })
  destinationZipCode: string;
}
