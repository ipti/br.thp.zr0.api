import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
} from 'class-validator';

export class CreateCartDto {

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    idCustomer: number;

}
