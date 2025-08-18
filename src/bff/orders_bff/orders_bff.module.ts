import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OrdersBffService } from './shared/orders_bff.service';
import { OrdersBffController } from './orders_bff.controller';
import { UsersService } from 'src/users/shared/users.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [OrdersBffController],
  providers: [OrdersBffService, UsersService],
  exports: [OrdersBffService],
})
export class OrdersBffModule {}
