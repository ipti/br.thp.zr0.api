import { Module } from '@nestjs/common';
import { TransformationWorkshopService } from './transformation_workshop.service';
import { TransformationWorkshopController } from './transformation_workshop.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransformationWorkshopController],
  providers: [TransformationWorkshopService],
})
export class TransformationWorkshopModule {}
