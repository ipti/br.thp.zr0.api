import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @ApiProperty({ description: "Product's id" })
   id?: string;
 
   @IsOptional()
   @IsString()
   @ApiPropertyOptional()
   name?: string;
 
   @IsOptional()
   @IsString()
   @ApiPropertyOptional()
   description?: string;
 
   @IsOptional()
   @IsNumber()
   @ApiPropertyOptional()
   price?: number;

   @IsOptional()
   @IsString()
   @ApiPropertyOptional()
   q?: string;
}
