import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { InventoryEntryService } from './shared/inventory-entry.service';
import { CreateInventoryEntryDto } from './dto/create-inventory-entry.dto';
import { UpdateInventoryEntryDto } from './dto/update-inventory-entry.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { InventoryEntryResponse } from './doc/inventory-entry.response';

@Controller('inventory-entry')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class InventoryEntryController {
  constructor(private readonly inventoryEntryService: InventoryEntryService) { }

  @Post()
  @ApiCreatedResponse({ type: InventoryEntryResponse })
  create(@Body() createInventoryEntryDto: CreateInventoryEntryDto) {
    return this.inventoryEntryService.create(createInventoryEntryDto);
  }

  @Get()
  findAll() {
    return this.inventoryEntryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryEntryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInventoryEntryDto: UpdateInventoryEntryDto) {
    return this.inventoryEntryService.update(+id, updateInventoryEntryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryEntryService.remove(+id);
  }
}
