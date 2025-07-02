import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class QueryInventoryDto {

    @IsOptional()
    @ApiProperty()
    idProduct: number;

    @IsOptional()
    @ApiProperty()
    idTransformationWorkshop: number;

    @IsOptional()
    @ApiProperty()
    quantity: number;
}