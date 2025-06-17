import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { BillingAddressCustomerService } from './shared/billing_address_customer.service';
import { CreateBillingAddressCustomerDto } from './dto/create-billing_address_customer.dto';
import { UpdateBillingAddressCustomerDto } from './dto/update-billing_address_customer.dto';
import { QueryBillingAddressCustomerDto } from './dto/query-billing_address_customer.dto';
import { BillingAddressCustomerResponse } from './doc/billing-address-customer.response';

@Controller('billing-address-customer')
export class BillingAddressCustomerController {
  constructor(private readonly billingAddressCustomerService: BillingAddressCustomerService) { }

  @Post()
  @ApiCreatedResponse({ type: BillingAddressCustomerResponse })
  async create(@Body() createBillingAddressCustomerDto: CreateBillingAddressCustomerDto) {
    return this.billingAddressCustomerService.create(createBillingAddressCustomerDto);
  }

  @Get()
  @ApiOkResponse({ type: [BillingAddressCustomerResponse] })
  @ApiBearerAuth('access-token')
  async findAll(@Query() query: QueryBillingAddressCustomerDto) {
    return this.billingAddressCustomerService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: [BillingAddressCustomerResponse] })
  @ApiBearerAuth('access-token')
  findOne(@Param('id') id: string) {
    return this.billingAddressCustomerService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: [BillingAddressCustomerResponse] })
  @ApiBearerAuth('access-token')
  update(@Param('id') id: string, @Body() updateBillingAddressCustomerDto: UpdateBillingAddressCustomerDto) {
    return this.billingAddressCustomerService.update(+id, updateBillingAddressCustomerDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string) {
    return this.billingAddressCustomerService.remove(+id);
  }
}
