import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class QueryCartDto {
    @ApiProperty({ description: "Cart's id" })
    id: string;

    @IsOptional()
    @ApiProperty()
    idCustomer: number;

}
