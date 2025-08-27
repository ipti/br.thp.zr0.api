import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Shipping2Service } from './shipping2.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [ShippingService, Shipping2Service, MeuEnvioShippingStrategy],
  exports: [ShippingService, Shipping2Service],
})
export class ShippingModule {}
