import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BillingAddressCustomerService } from './shared/billing_address_customer.service';
import { BillingAddressCustomerController } from './billing_address_customer.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BillingAddressCustomerController],
  providers: [BillingAddressCustomerService],
})
export class BillingAddressCustomerModule { }
