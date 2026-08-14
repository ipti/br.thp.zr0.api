import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  async createPaymentIntent(
    @Req() req: Request,
    @Body() body: { idOrder: number },
  ) {
    return this.paymentService.getPaymentIntent(
      Number(body.idOrder),
      req.user!.id,
      req.user!.role,
    );
  }

  @Patch('refund-payment-intent')
  async refundPaymentIntent(
    @Req() req: Request,
    @Body() body: { idOrder: number },
  ) {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem reembolsar pedidos');
    }

    return this.paymentService.refundPaymentIntent(Number(body.idOrder));
  }

  @Get('create-intent/:idOrder')
  async getPaymentIntent(
    @Req() req: Request,
    @Param('idOrder') idOrder: string,
  ) {
    return this.paymentService.getPaymentIntent(
      Number(idOrder),
      req.user!.id,
      req.user!.role,
    );
  }
}
