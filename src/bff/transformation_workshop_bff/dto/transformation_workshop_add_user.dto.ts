import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional
} from 'class-validator';

export class AddUserTransformationWorkshopDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty()
  user_fk?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty()
  tw_fk?: number;
}
