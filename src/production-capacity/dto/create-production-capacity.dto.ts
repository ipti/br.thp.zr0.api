import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

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
  @IsInt()
  @Min(1)
  @ApiProperty()
  monthlyCapacity: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: false })
  active?: boolean;
}
