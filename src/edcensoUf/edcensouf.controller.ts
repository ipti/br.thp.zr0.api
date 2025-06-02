import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiBearerAuth
} from '@nestjs/swagger';
import { StateResponse } from './doc/state.response';
import { QueryStateDto } from './dto/query-state.dto';
import { stateService } from './shared/state.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('state')
@ApiTags('State')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class StateController {
  constructor(private stateService: stateService) {}

  @Get()
  @ApiCreatedResponse({ type: [StateResponse] })
  async getAll(
    @Query() query: QueryStateDto,
    @Query('include') include: string,
  ) {
    return this.stateService.findAll(query, include);
  }

  @Get(':id')
  @ApiOkResponse({ type: StateResponse })
  async getById(@Param('id') id: string) {
    return this.stateService.findOne(+id);
  }
}
