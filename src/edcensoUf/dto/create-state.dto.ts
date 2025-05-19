import { ApiProperty } from '@nestjs/swagger';
import { State } from '../entities/state.entity';

export class CreateStateDto extends State {
  @ApiProperty({ description: 'UF name' })
  declare name: string;

  @ApiProperty({ description: "UF's acronym" })
  declare acronym: string;
}
