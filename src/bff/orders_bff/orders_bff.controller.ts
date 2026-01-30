import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OrdersBffService } from './shared/orders_bff.service';

@ApiTags('Orders-Bff')
@Controller('orders-bff')
export class OrdersBffController {
  constructor(private readonly ordersBffService: OrdersBffService) {}

  @Get('tw/:idTw')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async ordersFromWorkshopTransformation(@Param('idTw') idTw: string) {
    return this.ordersBffService.ordersFromWorkshopTransformation(+idTw);
  }


  @Get('transformation-workshop-one')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async ordersFromWorkshopTransformationFindOne(@Query('idOrder') idOrder: string, @Query('idTw') idTw: string) {
    return this.ordersBffService.ordersFromWorkshopTransformationFindOne(+idOrder,+idTw);
  }
}
