import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateDefaultAddressCustomerDto {


   
    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    addressId: number;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    customerId: number;

}

