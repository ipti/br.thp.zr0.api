import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional } from 'class-validator';

export class QueryProductionCapacityDto extends PaginationDto {
  @IsOptional()
  @ApiPropertyOptional()
  idProduct?: number;

  @IsOptional()
  @ApiPropertyOptional()
  idTransformationWorkshop?: number;

  @IsOptional()
  @ApiPropertyOptional()
  active?: boolean;
}
