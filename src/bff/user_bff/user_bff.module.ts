import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersService } from 'src/users/shared/users.service';
import { UserBffService } from './shared/user_bff.service';
import { AuxUserController } from './user_bff.controller';
import { EmailService } from 'src/utils/middleware/email.middleware';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), ],
  controllers: [AuxUserController],
  providers: [UserBffService, UsersService, EmailService],
  exports: [UserBffService],
})
export class UserBffModule {}
