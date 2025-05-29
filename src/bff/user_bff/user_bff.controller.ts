import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserBffService } from './shared/user_bff.service';

@ApiTags('User-Bff')
@Controller('user-bff')
export class AuxUserController {
  constructor(private readonly userBffService: UserBffService) {}
  @Get('transf-work')
  findOne(@Req() req: any) {
    return this.userBffService.FindUserTranformationWorkshop(
      req.user?.sub ?? 1,
    );
  }
}
