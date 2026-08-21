import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddProductTransformationWorkshopDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty()
  product_fk: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty()
  tw_fk: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiProperty()
  quantity: number;
}
