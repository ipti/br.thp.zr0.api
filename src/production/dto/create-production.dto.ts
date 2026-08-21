import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { production_status } from '@prisma/client';

export class CreateProductionDto {
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  dateStart?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  dateEnd?: string;

  @IsOptional()
  @IsEnum(production_status)
  @ApiPropertyOptional({ enum: production_status, default: 'QUEUED' })
  productionStatus?: production_status;

  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @Min(1)
  @ApiProperty()
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ default: 0 })
  producedQuantity?: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  idProduct: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  idTransformationWorkshop: number;
}
