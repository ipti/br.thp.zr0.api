import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AddressCustomerService } from './shared/address_customer.service';
import { AddressCustomerController } from './address_customer.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AddressCustomerController],
  providers: [AddressCustomerService],
})
export class AddressCustomerModule { }
