import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ShippingService } from './shipping.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [ShippingService, MeuEnvioShippingStrategy],
  exports: [ShippingService],
})
export class ShippingModule {}
