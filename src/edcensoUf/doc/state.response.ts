import { ApiProperty } from '@nestjs/swagger';

export class StateResponse {
  @ApiProperty({ description: 'State id' })
  id: string;

  @ApiProperty({ description: 'State name' })
  name: string;

  @ApiProperty({ description: "State's acronym" })
  acronym: string;
}
