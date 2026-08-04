import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ProductionCapacityResponse {
  @IsNotEmpty()
  @ApiProperty()
  transformation_workshop_fk: number;

  @IsNotEmpty()
  @ApiProperty()
  product_fk: number;

  @IsNotEmpty()
  @ApiProperty()
  monthly_capacity: number;

  @IsNotEmpty()
  @ApiProperty()
  active: boolean;
}
