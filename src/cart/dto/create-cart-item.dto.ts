import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateCartItemDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  quantity: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  variantId?: number;
}
