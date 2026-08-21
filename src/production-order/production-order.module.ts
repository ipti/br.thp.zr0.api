import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductionModule } from 'src/production/production.module';
import { MeuEnvioShippingStrategy } from 'src/shipping/strategies/meu-envio-shipping.strategy';
import { ProductionOrderService } from './shared/production-order.service';
import { ProductionOrderController } from './production-order.controller';

@Module({
  imports: [PrismaModule, ProductionModule],
  controllers: [ProductionOrderController],
  providers: [ProductionOrderService, MeuEnvioShippingStrategy],
  exports: [ProductionOrderService],
})
export class ProductionOrderModule {}
