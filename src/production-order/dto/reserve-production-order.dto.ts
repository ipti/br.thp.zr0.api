import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SimulationMode } from '@prisma/client';

export class ReserveProductionOrderShipmentDto {
  @IsInt()
  @ApiProperty()
  workshopId: number;

  @IsInt()
  @IsPositive()
  @ApiProperty()
  quantity: number;
}

export class ReserveProductionOrderDto {
  @IsInt()
  @ApiProperty()
  userId: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  productId: string; // product.uid

  @IsEnum(SimulationMode)
  @ApiProperty({ enum: SimulationMode })
  simulationMode: SimulationMode;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveProductionOrderShipmentDto)
  @ApiProperty({ type: [ReserveProductionOrderShipmentDto] })
  shipments: ReserveProductionOrderShipmentDto[];
}
