import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsIn, IsNumber, IsNumberString, IsOptional, IsString } from 'class-validator';

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

   @IsOptional()
   @IsNumberString()
   @ApiPropertyOptional({ description: 'Filter by category ID' })
   categoryId?: string;

   @IsOptional()
   @IsIn(['price_asc', 'price_desc', 'name_asc', 'newest'])
   @ApiPropertyOptional({ enum: ['price_asc', 'price_desc', 'name_asc', 'newest'] })
   sort?: string;
}
