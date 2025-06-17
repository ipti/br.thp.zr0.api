import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class QueryBillingAddressCustomerDto {
    @ApiProperty({ description: "Billing Address Customer's id" })
    id: string;

    @IsOptional()
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
