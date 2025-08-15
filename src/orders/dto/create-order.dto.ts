import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @IsInt()
  @ApiProperty()
  productId: number;

  @IsInt()
  @ApiProperty()
  workshopId: number;

  @IsInt()
  @ApiProperty()
  quantity: number;

  @ApiProperty()
  @IsObject()
  delivery_estimate: Record<string, any>;
}

export class AddressDto {

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiProperty()
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiProperty()
  cep: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  @ApiProperty()
  address: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @ApiProperty()
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty()
  complement: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty()
  neighborhood: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty()
  stateId: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty()
  cityId: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty()
  @IsOptional()
  observation?: string;

  @ApiProperty()
  @IsOptional()
  @Type(() => AddressDto)
  address?: AddressDto;
}
