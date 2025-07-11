import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateAddressCustomerDto {


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

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    customerId: number;

}
