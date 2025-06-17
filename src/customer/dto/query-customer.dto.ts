import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class QueryCustomerDto {
    @ApiProperty({ description: "Customer's id" })
    id: string;

    @IsOptional()
    @ApiProperty()
    cpf: string;

    @IsOptional()
    @ApiProperty()
    cnpj: string;

    @IsOptional()
    @ApiProperty()
    birthday: string;

    @IsOptional()
    @ApiProperty()
    phone: string;

    @IsOptional()
    @ApiProperty()
    corporate_name: string;

    @IsOptional()
    @ApiProperty()
    trade_name: string;

    @IsOptional()
    @ApiProperty()
    idUser: number;

}
