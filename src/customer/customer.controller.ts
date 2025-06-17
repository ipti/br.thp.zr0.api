import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { CustomerService } from './shared/customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerResponse } from './doc/customer.response';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) { }

  @Post()
  @ApiCreatedResponse({ type: CustomerResponse })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customerService.create(createCustomerDto);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: [CustomerResponse] })
  async findAll(@Query() query: QueryCustomerDto) {
    return this.customerService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(+id);
  }

  @Get(':id')
  @ApiOkResponse({ type: [CustomerResponse] })
  @ApiBearerAuth('access-token')
  async getById(@Param('id') id: string) {
    return this.customerService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CustomerResponse })
  @ApiBearerAuth('access-token')
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customerService.update(+id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  async remove(@Param('id') id: string) {
    return this.customerService.remove(+id);
  }

}
