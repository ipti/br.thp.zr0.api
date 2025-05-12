import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class QueryProductDto {
  @ApiProperty({ description: "Product's id" })
   id: string;
 
   @IsOptional()
   @ApiProperty()
   name: string;
 
   @IsOptional()
   @ApiProperty()
   description: string;
 
   @IsOptional()
   @ApiProperty()
   price: number;
 
}
