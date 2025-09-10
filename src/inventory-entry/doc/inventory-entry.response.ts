import { ApiProperty } from "@nestjs/swagger";
import {
    IsNotEmpty,
    MaxLength
} from 'class-validator';

export class InventoryEntryResponse {

    @IsNotEmpty()
    @ApiProperty()
    price: number;

    @IsNotEmpty()
    @ApiProperty()
    quantity: number;

    @IsNotEmpty()
    @ApiProperty()
    product_fk: number;

}