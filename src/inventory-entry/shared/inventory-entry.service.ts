import { Injectable } from '@nestjs/common';
import { CreateInventoryEntryDto } from '../dto/create-inventory-entry.dto';
import { UpdateInventoryEntryDto } from '../dto/update-inventory-entry.dto';

@Injectable()
export class InventoryEntryService {
  create(createInventoryEntryDto: CreateInventoryEntryDto) {
    return 'This action adds a new inventoryEntry';
  }

  findAll() {
    return `This action returns all inventoryEntry`;
  }

  findOne(id: number) {
    return `This action returns a #${id} inventoryEntry`;
  }

  update(id: number, updateInventoryEntryDto: UpdateInventoryEntryDto) {
    return `This action updates a #${id} inventoryEntry`;
  }

  remove(id: number) {
    return `This action removes a #${id} inventoryEntry`;
  }
}
