import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { production_status } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryProductionDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: "Production's id" })
  id?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  dateStart?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  dateEnd?: string;

  @IsOptional()
  @ApiProperty()
  status?: string;

  @IsOptional()
  @IsEnum(production_status)
  @ApiProperty({ enum: production_status, required: false })
  productionStatus?: production_status;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional()
  idProduct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional()
  idTransformationWorkshop?: number;
}
