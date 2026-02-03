import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OrdersBffService } from './shared/orders_bff.service';
import { UpdateOrderDto } from './dto/update-order.dto';

@ApiTags('Orders-Bff')
@Controller('orders-bff')
export class OrdersBffController {
  constructor(private readonly ordersBffService: OrdersBffService) { }

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
    return this.ordersBffService.ordersFromWorkshopTransformationFindOne(+idOrder, +idTw);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch('order-service-transformation-workshop')
  update(@Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersBffService.updateOrderService(updateOrderDto);
  }

    @Get('solited-cancellation')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async getOrdersSolitedCancellation() {
    return this.ordersBffService.getOrdersSolitedCancellation();
  }

}
