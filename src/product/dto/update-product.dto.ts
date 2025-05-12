import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductDto {
   @IsOptional()
   @IsString()
   @MaxLength(150)
   @ApiProperty()
   name: string;
 
   @IsOptional()
   @IsString()
   @MaxLength(150)
   @ApiProperty()
   description: string;
 
   @IsOptional()
   @IsNumber()
   @ApiProperty()
   price: number;
}
