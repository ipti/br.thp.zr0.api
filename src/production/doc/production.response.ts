import { ApiProperty } from "@nestjs/swagger";
import {
    IsNotEmpty
} from 'class-validator';

export class ProductionResponse {
    @ApiProperty({ description: "Production's id" })
    id: string;

    @IsNotEmpty()
    @ApiProperty()
    dateStart: string;

    @IsNotEmpty()
    @ApiProperty()
    dateEnd: string;

    @IsNotEmpty()
    @ApiProperty()
    status: string;

    @IsNotEmpty()
    @ApiProperty()
    quantity: number;

    @IsNotEmpty()
    @ApiProperty()
    idProduct: number;

    @IsNotEmpty()
    @ApiProperty()
    idTransformationWorkshop: number;

}