import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryUserDto extends PaginationDto {
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
