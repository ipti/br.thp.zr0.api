import { ApiProperty } from '@nestjs/swagger';
import { City } from '../entities/city.entity';

export class CityResponse {
  @ApiProperty({ description: "City's identification." })
  id: string;

  @ApiProperty({ description: "City's name." })
  name: string;

  @ApiProperty({ description: "City's initial CEP." })
  cep_initial: string;

  @ApiProperty({ description: "City's final CEP." })
  cep_final: string;

  @ApiProperty({ description: "City's first DDD." })
  ddd1: string;

  @ApiProperty({ description: "City's second DDD." })
  ddd2: string;

  @ApiProperty({ type: () => City })
  edcenso_uf_fk: City['id'];
}
