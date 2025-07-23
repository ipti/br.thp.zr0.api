import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags
} from '@nestjs/swagger';
import { StateResponse } from './doc/state.response';
import { QueryStateDto } from './dto/query-state.dto';
import { stateService } from './shared/state.service';

@Controller('state')
@ApiTags('State')
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
