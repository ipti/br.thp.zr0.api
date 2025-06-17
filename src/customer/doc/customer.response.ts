import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  MaxLength
} from 'class-validator';

export class CustomerResponse {
  @ApiProperty({ description: "Customer's id" })
  id: string;

  @IsOptional()
  @MaxLength(11)
  @ApiProperty()
  cpf: string;

  @IsOptional()
  @MaxLength(14)
  @ApiProperty()
  cnpj: string;

  @IsOptional()
  @ApiProperty()
  birthday: string;

  @IsOptional()
  @MaxLength(191)
  @ApiProperty()
  phone: string;

  @IsOptional()
  @MaxLength(150)
  @ApiProperty()
  corporate_name: string;

  @IsOptional()
  @MaxLength(150)
  @ApiProperty()
  trade_name: string;

  @IsNotEmpty()
  @ApiProperty()
  user_fk: number;
}
