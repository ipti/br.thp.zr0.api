import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserResponse } from './doc/users.response';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './shared/users.service';

@ApiTags('Users')
// @ApiBearerAuth('access-token')
// @UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiCreatedResponse({ type: UserResponse })
  async create(@Body() user: CreateUserDto) {
    return this.usersService.create(user);
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

  @Put(':id')
  @ApiCreatedResponse({ type: UserResponse })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() user: UpdateUserDto,
  ) {
    return this.usersService.update(+id, user, "1");
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.usersService.remove(id);
  }
}
