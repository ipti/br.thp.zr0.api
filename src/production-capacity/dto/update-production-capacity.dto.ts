import { PartialType } from '@nestjs/swagger';
import { CreateProductionCapacityDto } from './create-production-capacity.dto';

export class UpdateProductionCapacityDto extends PartialType(
  CreateProductionCapacityDto,
) {}
