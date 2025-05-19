import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTransformationWorkshopDto {

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    name: string

    @IsOptional()
    @IsString()
    @ApiProperty()
    cnpj: string
@IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsNumber()
  city_fk?: number;

  @IsOptional()
  @IsNumber()
  state_fk?: number;
}

