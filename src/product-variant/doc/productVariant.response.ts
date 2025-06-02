import { ApiProperty } from "@nestjs/swagger";
import {
    IsNotEmpty,
    MaxLength
} from 'class-validator';

export class ProductVariantResponse {
    @ApiProperty({ description: "Product Variant's id" })
    id: string;

    @IsNotEmpty()
    @MaxLength(120)
    @ApiProperty()
    name: string;

    @IsNotEmpty()
    @ApiProperty()
    price: number;

    @IsNotEmpty()
    @ApiProperty()
    amount: string;

    @IsNotEmpty()
    @ApiProperty()
    product_fk: number;

}