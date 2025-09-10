import { Module } from '@nestjs/common';
import { InventoryEntryService } from './shared/inventory-entry.service';
import { InventoryEntryController } from './inventory-entry.controller';

@Module({
  controllers: [InventoryEntryController],
  providers: [InventoryEntryService],
})
export class InventoryEntryModule { }
