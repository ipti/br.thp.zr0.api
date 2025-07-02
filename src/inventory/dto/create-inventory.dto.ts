import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber
} from 'class-validator';
export class CreateInventoryDto {

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    idProduct: number;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    idTransformationWorkshop: number;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    quantity: number;
}
