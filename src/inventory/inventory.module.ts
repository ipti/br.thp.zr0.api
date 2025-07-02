import { Module } from '@nestjs/common';
import { InventoryService } from './shared/inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule { }
