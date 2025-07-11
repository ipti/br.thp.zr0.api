import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    MaxLength
} from 'class-validator';

export class AddressCustomerResponse {
    @ApiProperty({ description: "Address Customer's id" })
    id: string;

    @IsOptional()
    @MaxLength(191)
    @ApiProperty()
    cep: string;

    @IsNotEmpty()
    @MaxLength(191)
    @ApiProperty()
    address: string;

    @IsNotEmpty()
    @MaxLength(100)
    @ApiProperty()
    number: string;

    @IsOptional()
    @MaxLength(100)
    @ApiProperty()
    complement: string;

    @IsOptional()
    @MaxLength(100)
    @ApiProperty()
    neighborhood: string;

    @IsOptional()
    @ApiProperty()
    stateId: number;

    @IsOptional()
    @ApiProperty()
    cityId: number;

    @IsNotEmpty()
    @ApiProperty()
    customerId: number;
}
