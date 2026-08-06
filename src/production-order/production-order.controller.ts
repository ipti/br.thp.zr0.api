import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProductionOrderService } from './shared/production-order.service';
import { SimulateProductionOrderDto } from './dto/simulate-production-order.dto';
import { ReserveProductionOrderDto } from './dto/reserve-production-order.dto';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';

@Controller('production-order')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class ProductionOrderController {
  constructor(
    private readonly productionOrderService: ProductionOrderService,
  ) {}

  @Post('simulate')
  @ApiOkResponse()
  async simulate(
    @Body() simulateProductionOrderDto: SimulateProductionOrderDto,
  ) {
    return this.productionOrderService.simulate(simulateProductionOrderDto);
  }

  @Post('reserve')
  @ApiOkResponse()
  async reserve(@Body() reserveProductionOrderDto: ReserveProductionOrderDto) {
    return this.productionOrderService.reserve(reserveProductionOrderDto);
  }

  @Post()
  @ApiOkResponse()
  async create(@Body() createProductionOrderDto: CreateProductionOrderDto) {
    return this.productionOrderService.create(createProductionOrderDto);
  }

  @Post('release-expired')
  @ApiOkResponse()
  async releaseExpired() {
    return this.productionOrderService.releaseExpiredProductionReservations();
  }
}
