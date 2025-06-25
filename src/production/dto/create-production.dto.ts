import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsDateString,
    IsString,
    MaxLength
} from 'class-validator';

export class CreateProductionDto {

    @IsOptional()
    @IsDateString()
    @ApiProperty()
    dateStart: string;

    @IsOptional()
    @IsDateString()
    @ApiProperty()
    dateEnd: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(191)
    @ApiProperty()
    status: string;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    quantity: number;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    idProduct: number;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    idTransformationWorkshop: number;
}
