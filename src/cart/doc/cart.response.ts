import { ApiProperty } from "@nestjs/swagger";
import {
    IsNotEmpty
} from 'class-validator';

export class CartResponse {
    @ApiProperty({ description: "Cart's id" })
    id: string;

    @IsNotEmpty()
    @ApiProperty()
    customer_fk: number;

}