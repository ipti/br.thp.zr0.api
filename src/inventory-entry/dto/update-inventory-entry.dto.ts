import { PartialType } from '@nestjs/swagger';
import { CreateInventoryEntryDto } from './create-inventory-entry.dto';

export class UpdateInventoryEntryDto extends PartialType(CreateInventoryEntryDto) {}
