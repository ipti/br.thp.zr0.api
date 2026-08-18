import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';

export class QueryProductionCapacityDto extends PaginationDto {
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

  @IsOptional()
  @Transform((params: TransformFnParams) => {
    const value: unknown = params.value;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @ApiPropertyOptional()
  active?: boolean;
}
