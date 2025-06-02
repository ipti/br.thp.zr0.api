import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserBffService } from './shared/user_bff.service';
import { CreateUserBffDto } from './dto/create-user.dto';
import { AuthService } from 'src/auth/shared/auth.service';
import { EmailService } from 'src/utils/middleware/email.middleware';

@ApiTags('User-Bff')
@Controller('user-bff')
export class AuxUserController {
  constructor(
    private readonly userBffService: UserBffService,
    private authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  @Post('created-user-with-tw')
  @ApiCreatedResponse({})
  async create(@Body() userCreate: CreateUserBffDto) {
    const user = await this.userBffService.create(userCreate);

    const token = await this.authService.generateToken(user);

    const link = `${process.env.SITE}/auth/verify-email?token=${token.access_token}`;

    await this.emailService.sendEmail(
      user.email,
      'Verificação de email',
      'verifyEmail.hbs',
      { verificationLink: link },
    );

    return user;
  }

  @Get('transf-work')
  findOne(@Req() req: any) {
    return this.userBffService.FindUserTranformationWorkshop(
      req.user?.sub ?? 1,
    );
  }
}
