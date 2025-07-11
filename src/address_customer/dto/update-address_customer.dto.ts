import { PartialType } from '@nestjs/swagger';
import { CreateAddressCustomerDto } from './create-address_customer.dto';

export class UpdateAddressCustomerDto extends PartialType(CreateAddressCustomerDto) {}
