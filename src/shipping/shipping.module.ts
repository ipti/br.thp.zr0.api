import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [ShippingService, MeuEnvioShippingStrategy],
})
export class ShippingModule {}
