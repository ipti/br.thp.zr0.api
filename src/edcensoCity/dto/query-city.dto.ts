import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { City } from '../entities/city.entity';

export class QueryCityDto {
  @Transform(({ value }) => {
    return Number.parseInt(value, 10);
  })
  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: "City's id in IBGE data." })
  id: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: "City's name." })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: "City's initial CEP." })
  cep_initial: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: "City's final CEP." })
  cep_final: string;

  @Transform(({ value }) => {
    return Number.parseInt(value, 10);
  })
  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: "City's first DDD." })
  ddd1: number;

  @Transform(({ value }) => {
    return Number.parseInt(value, 10);
  })
  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: "City's second DDD." })
  ddd2: number;

  @Transform(({ value }) => {
    return Number.parseInt(value, 10);
  })
  @IsOptional()
  @IsNumber()
  @ApiProperty({  })
  state_fk: City['id'];
}
