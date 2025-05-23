import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserBffService } from './shared/user_bff.service';
import { Request } from 'express';

@ApiTags('User-Bff')
@Controller('user-bff')
export class AuxUserController {
  constructor(private readonly userBffService: UserBffService) {}
  @Get('transf-work')
  findOne(@Req() req: Request) {
    return this.userBffService.FindUserTranformationWorkshop(req.user?.id ?? 1);
  }
}
