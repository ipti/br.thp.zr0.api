import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, SimulationMode } from '@prisma/client';

export class CreateProductionOrderShipmentDto {
  @IsInt()
  @ApiProperty()
  workshopId: number;

  @IsInt()
  @IsPositive()
  @ApiProperty()
  quantity: number;

  // Informativo (prazo de frete), não recalculado no servidor nesta etapa —
  // ao contrário de estimated_ready_at, não representa um recurso disputado
  // entre clientes, então não há necessidade de travar/recalcular aqui.
  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false })
  estimatedDeliveryAt?: string;
}

export class CreateProductionOrderAddressDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiProperty({ required: false })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiProperty({ required: false })
  cep?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  @ApiProperty()
  address: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @ApiProperty()
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ required: false })
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ required: false })
  neighborhood?: string;

  @IsOptional()
  @IsInt()
  @ApiProperty({ required: false })
  stateId?: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ required: false })
  cityId?: number;
}

export class CreateProductionOrderDto {
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
  @Type(() => CreateProductionOrderShipmentDto)
  @ApiProperty({ type: [CreateProductionOrderShipmentDto] })
  shipments: CreateProductionOrderShipmentDto[];

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiProperty({ required: false, enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  observation?: string;

  @IsOptional()
  @Type(() => CreateProductionOrderAddressDto)
  @ValidateNested()
  @ApiProperty({ required: false })
  address?: CreateProductionOrderAddressDto;
}
