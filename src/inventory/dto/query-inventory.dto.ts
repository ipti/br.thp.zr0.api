import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional } from 'class-validator';

export class QueryInventoryDto extends PaginationDto {

    @IsOptional()
    @ApiProperty()
    idProduct?: number;

    @IsOptional()
    @ApiProperty()
    idTransformationWorkshop?: number;

    @IsOptional()
    @ApiProperty()
    quantity?: number;
}
