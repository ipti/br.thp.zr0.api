import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';
import { RecoveryPasswordDto } from '../dto/recovery_password_user.dto';
import { SendEmailRecoveryPasswordDto } from '../dto/send_email _recovery_password_user.dto';
import { AuthService } from 'src/auth/shared/auth.service';
import { EmailService } from 'src/utils/middleware/email.middleware';

@Injectable()
export class AuxUserBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  async verifyEmail(userId: number) {
    try {
      await this.usersService.findOne(userId);
      const updatedUser = await this.prisma.users.update({
        where: {
          id: userId,
        },
        data: { verify_email: true },
      });

      return updatedUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async recoveryPassword(
    userId: number,
    recoveryPasswordDto: RecoveryPasswordDto,
  ) {
    try {
      await this.usersService.findOne(userId);

      const hashedPassword = await this.hashPassword(
        recoveryPasswordDto.password,
      );
      const updatedUser = await this.prisma.users.update({
        where: {
          id: userId,
        },
        data: { password: hashedPassword },
      });

      return updatedUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async sendEmailRecoveryPassword(
    sendEmailrecoveryPasswordDto: SendEmailRecoveryPasswordDto,
  ) {
    try {
      const user = await this.usersService.findOneByEmail(
        sendEmailrecoveryPasswordDto.email,
      );

      if (!user) {
        throw new HttpException('Email not found', HttpStatus.NOT_FOUND);
      }

      const token = await this.authService.generateTokenPasswordRec(user);

      const link = `${process.env.SITE}/auth/reset-password?token=${token.access_token}`;

      await this.emailService.sendEmail(
        user.email,
        'Resetar senha',
        'passwordRec.hbs',
        { passwordResetLink: link, name: user.name },
      );

      return { message: 'Email enviado com sucesso' };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
