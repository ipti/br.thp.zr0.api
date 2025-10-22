import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '../../users/shared/users.service';
import { JwtStrategy } from '../strategies/jwt-strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtStrategy: JwtStrategy,
  ) {}

  async validateUser(userUsername: string, userPassword: string) {
    const user = await this.usersService.findOneByEmail(userUsername);

    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (
      user &&
      (await this.usersService.validatePassword(userPassword, user.password))
    ) {
      const { name, email, id } = user;

      return { name, email, id };
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };

    const userRegistered = await this.usersService.findOneByEmail(user.email);

    await this.usersService.findVerifyEmail(user.id);

    return {
      access_token: this.jwtStrategy.generateSignToken(payload),
      userRegistered,
    };
  }

  async generateToken(user: any) {
    const payload = { email: user.email, sub: user.id };

    const userRegistered = await this.usersService.findOneByEmail(user.email);

    return {
      access_token: this.jwtStrategy.generateSignToken(payload),
      userRegistered,
    };
  }

  async generateTokenPasswordRec(user: any) {
    const payload = { email: user.email, sub: user.id };

    const userRegistered = await this.usersService.findOneByEmail(user.email);

    return {
      access_token: this.jwtStrategy.generatePasswordRecToken(payload),
      userRegistered,
    };
  }
}
