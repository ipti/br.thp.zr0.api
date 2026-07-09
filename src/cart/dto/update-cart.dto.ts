import { PartialType } from '@nestjs/swagger';
import { CreateCartDto } from './create-cart.dto';
import { CreateCartItemDto } from './create-cart-item.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartDto extends PartialType(CreateCartDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCartItemDto)
  @ApiProperty({ type: [CreateCartItemDto], required: false })
  items?: CreateCartItemDto[];
}
