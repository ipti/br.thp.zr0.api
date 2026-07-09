import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class QueryAddressCustomerDto {
    @ApiProperty({ description: "Billing Address Customer's id" })
    id: string;

    @IsOptional()
    @Matches(/^\d{8}$/, { message: 'CEP deve conter 8 dígitos numéricos' })
    @ApiProperty()
    cep: string;

    @IsOptional()
    @ApiProperty()
    address: string;

    @IsOptional()
    @ApiProperty()
    number: string;

    @IsOptional()
    @ApiProperty()
    complement: string;

    @IsOptional()
    @ApiProperty()
    neighborhood: string;

    @IsOptional()
    @ApiProperty()
    stateId: number;

    @IsOptional()
    @ApiProperty()
    cityId: number;

    @IsOptional()
    @ApiProperty()
    customerId: number;

}
