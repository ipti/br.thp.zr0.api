import { Module } from '@nestjs/common';
import { ProductionCapacityService } from './shared/production-capacity.service';
import { ProductionCapacityController } from './production-capacity.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionCapacityController],
  providers: [ProductionCapacityService],
})
export class ProductionCapacityModule {}
