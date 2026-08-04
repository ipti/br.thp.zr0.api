import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateProductionCapacityDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  idProduct: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  idTransformationWorkshop: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  monthlyCapacity: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: false })
  active?: boolean;
}
