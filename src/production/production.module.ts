import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductionService } from './shared/production.service';
import { ProductionQueueService } from './shared/production-queue.service';
import { ProductionController } from './production.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionController],
  providers: [ProductionService, ProductionQueueService],
  exports: [ProductionService, ProductionQueueService],
})
export class ProductionModule {}
