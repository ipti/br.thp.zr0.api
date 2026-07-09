import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class QueryTransformationWorkshopDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  name?: string;
}
