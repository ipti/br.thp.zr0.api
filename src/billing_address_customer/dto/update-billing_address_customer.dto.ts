import { PartialType } from '@nestjs/swagger';
import { CreateBillingAddressCustomerDto } from './create-billing_address_customer.dto';

export class UpdateBillingAddressCustomerDto extends PartialType(CreateBillingAddressCustomerDto) {}
