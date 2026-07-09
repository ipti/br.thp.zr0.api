import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional } from 'class-validator';

export class QueryProductionDto extends PaginationDto {
    @IsOptional()
    @ApiProperty({ description: "Production's id" })
    id?: string;

    @IsOptional()
    @ApiProperty()
    dateStart?: string;

    @IsOptional()
    @ApiProperty()
    dateEnd?: string;

    @IsOptional()
    @ApiProperty()
    status?: string;

    @IsOptional()
    @ApiProperty()
    quantity?: number;

    @IsOptional()
    @ApiProperty()
    idProduct?: number;

    @IsOptional()
    @ApiProperty()
    idTransformationWorkshop?: number;

}
