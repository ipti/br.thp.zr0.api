import { Body, Controller, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RecoveryPasswordDto } from './dto/recovery_password_user.dto';
import { SendEmailRecoveryPasswordDto } from './dto/send_email _recovery_password_user.dto';
import { AuxUserBffService } from './shared/aux_user_bff.service';

@ApiTags('Aux-User')
@Controller('aux-user')
export class AuxUserController {
  constructor(private readonly auxUserBffService: AuxUserBffService) {}

  @Put('verify-email')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async verifyEmail(@Req() req: Request) {
    return this.auxUserBffService.verifyEmail(req.user?.id ?? 1);
  }

  @Put('recovery-password')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async recoveryPassword(
    @Req() req: Request,
    @Body() body: RecoveryPasswordDto,
  ) {
    return this.auxUserBffService.recoveryPassword(req.user?.id ?? 1, body);
  }

  @Put('send-email-recover-password')
  @ApiCreatedResponse()
  async sendEmailRecoveryPassword(@Body() body: SendEmailRecoveryPasswordDto) {
    return this.auxUserBffService.sendEmailRecoveryPassword(body);
  }
}
