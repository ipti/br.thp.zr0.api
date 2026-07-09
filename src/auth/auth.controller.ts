import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './shared/auth.service';

@Controller()
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LoginThrottleGuard, LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req: any, @Body() auth: CreateAuthDto) {
    LoginThrottleGuard.resetAttempt(req);
    return this.authService.login(req.user);
  }

}
