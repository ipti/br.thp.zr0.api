import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryUserDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  name?: string;

  @IsOptional()
  @Transform(({ value }) => {
    return Number.parseInt(value, 10);
  })
  @IsBoolean()
  @ApiProperty({ required: false })
  active?: boolean;
}
