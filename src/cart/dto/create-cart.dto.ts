import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCartItemDto } from './create-cart-item.dto';

export class CreateCartDto {

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    idCustomer: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCartItemDto)
    @ApiProperty({ type: [CreateCartItemDto], required: false })
    items?: CreateCartItemDto[];

}
