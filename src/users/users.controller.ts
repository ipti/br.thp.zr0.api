import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserResponse } from './doc/users.response';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './shared/users.service';
import { AuthService } from 'src/auth/shared/auth.service';
import { EmailService } from 'src/utils/middleware/email.middleware';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('Users')
// @ApiBearerAuth('access-token')
// @UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private authService: AuthService,
    private readonly emailService: EmailService,
  ) { }

  @Post()
  @ApiCreatedResponse({ type: UserResponse })
  async create(@Body() userCreate: CreateUserDto) {
    const user = await this.usersService.create(userCreate);

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

  @Get()
  @ApiOkResponse({ type: [UserResponse] })
  async getAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: [UserResponse] })
  async getById(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post('get-email')
  @ApiOkResponse({ type: [UserResponse] })
  async getByEmail(@Body() body: VerifyEmailDto) {
    console.log(body)
    return this.usersService.verifyByEmail(body.email);
  }

  @Put(':id')
  @ApiCreatedResponse({ type: UserResponse })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() user: UpdateUserDto,
  ) {
    return this.usersService.update(+id, user, '1');
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.usersService.remove(id);
  }
}
