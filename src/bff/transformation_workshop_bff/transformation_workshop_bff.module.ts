import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransformationWorkshopBffService } from './shared/transformation_workshop_bff.service';
import { TransformationWorkshopBffController } from './transformation_workshop_bff.controller';
import { UsersService } from 'src/users/shared/users.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [TransformationWorkshopBffController],
  providers: [TransformationWorkshopBffService, UsersService],
  exports: [TransformationWorkshopBffService],
})
export class TransformationWorkshopBffModule {}
