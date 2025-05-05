import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersService } from 'src/users/shared/users.service';
import { EmailService } from 'src/utils/middleware/email.middleware';
import { AuxUserController } from './aux_user_bff.controller';
import { AuxUserBffService } from './shared/aux_user_bff.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), ],
  controllers: [AuxUserController],
  providers: [AuxUserBffService, EmailService, UsersService],
  exports: [AuxUserBffService],
})
export class AuxUserBffModule {}
