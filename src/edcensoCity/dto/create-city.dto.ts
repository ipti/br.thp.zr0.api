import { ApiProperty } from '@nestjs/swagger';
import { City } from '../entities/city.entity';

export class CreateEdcensoCityDto {
  @ApiProperty({ description: "City's id in IBGE data.", required: true })
  oldId: string;

  @ApiProperty({ description: "City's name.", required: true })
  name: string;

  @ApiProperty({ description: "City's initial CEP." })
  cep_initial: string;

  @ApiProperty({ description: "City's final CEP." })
  cep_final: string;

  @ApiProperty({ description: "City's first DDD." })
  ddd1: string;

  @ApiProperty({ description: "City's second DDD." })
  ddd2: string;

  @ApiProperty({  })
  edcensoUfId: City['id'];
}
