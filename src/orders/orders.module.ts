import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailService } from 'src/utils/middleware/email.middleware';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, EmailService],
  imports: [PrismaModule],
})
export class OrdersModule {}
