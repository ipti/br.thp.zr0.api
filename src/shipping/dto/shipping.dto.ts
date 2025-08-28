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
import { ApiProperty } from '@nestjs/swagger';

class OrderItemDto {
  @IsString()
  @ApiProperty()
  productId: string;

  @IsNumber()
  @Min(1)
  @ApiProperty()
  quantity: number;
}

export class ShippingRequestDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ApiProperty({ type: OrderItemDto })
  orderItems: OrderItemDto[];

  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'Invalid Brazilian CEP format (expected 12345-678)',
  })
  @ApiProperty()
  destinationZipCode: string;
}
