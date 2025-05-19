import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTransformationWorkshopDto {

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    name: string

    @IsOptional()
    @IsString()
    @ApiProperty()
    cnpj: string

    @IsOptional()
    @IsString()
    @ApiProperty()
    location: string
}

