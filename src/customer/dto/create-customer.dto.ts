import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsDateString,
    IsNumber,
    MaxLength,
} from 'class-validator';

export class CreateCustomerDto {

    @IsOptional()
    @IsString()
    @MaxLength(11)
    @ApiProperty()
    cpf: string;

    @IsOptional()
    @IsString()
    @MaxLength(14)
    @ApiProperty()
    cnpj: string;

    @IsOptional()
    @IsDateString()
    @ApiProperty()
    birthday: string;

    @IsOptional()
    @IsString()
    @MaxLength(191)
    @ApiProperty()
    phone: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    @ApiProperty()
    corporate_name: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    @ApiProperty()
    trade_name: string;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    idUser: number;

}
