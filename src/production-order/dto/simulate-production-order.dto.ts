import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class SimulateProductionOrderDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  productId: string; // product.uid

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  quantity: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  destinationZipCode: string;
}
