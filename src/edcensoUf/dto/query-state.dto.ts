import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { State } from '../entities/state.entity';

export class QueryStateDto extends State {
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'UF name' })
  declare name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: "UF's acronym" })
  declare acronym: string;
}
