import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class QueryProductVariantDto {
  @ApiProperty({ description: "Product Variant's id" })
   id: string;
 
   @IsOptional()
   @ApiProperty()
   name: string;
 
   @IsOptional()
   @ApiProperty()
   amount: number;
 
   @IsOptional()
   @ApiProperty()
   price: number;
 
}
