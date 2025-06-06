import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransformationWorkshopProductBffService } from './shared/transformation_workshop_bff.service';
import { TransformationWorkshopProductBffController } from './transformation_workshop_bff.controller';
import { UsersService } from 'src/users/shared/users.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [TransformationWorkshopProductBffController],
  providers: [TransformationWorkshopProductBffService, UsersService],
  exports: [TransformationWorkshopProductBffService],
})
export class TransformationWorkshopProductBffModule {}
