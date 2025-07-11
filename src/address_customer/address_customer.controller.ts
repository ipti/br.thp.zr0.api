import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AddressCustomerService } from './shared/address_customer.service';
import { CreateAddressCustomerDto } from './dto/create-address_customer.dto';
import { UpdateAddressCustomerDto } from './dto/update-address_customer.dto';
import { QueryAddressCustomerDto } from './dto/query-address_customer.dto';
import { AddressCustomerResponse } from './doc/address-customer.response';

@Controller('address-customer')
export class AddressCustomerController {
  constructor(
    private readonly AddressCustomerService: AddressCustomerService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: AddressCustomerResponse })
  async create(@Body() CreateAddressCustomerDto: CreateAddressCustomerDto) {
    return this.AddressCustomerService.create(CreateAddressCustomerDto);
  }

  @Get()
  @ApiOkResponse({ type: [AddressCustomerResponse] })
  @ApiBearerAuth('access-token')
  async findAll(@Query() query: QueryAddressCustomerDto) {
    return this.AddressCustomerService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: [AddressCustomerResponse] })
  @ApiBearerAuth('access-token')
  findOne(@Param('id') id: string) {
    return this.AddressCustomerService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: [AddressCustomerResponse] })
  @ApiBearerAuth('access-token')
  update(
    @Param('id') id: string,
    @Body() UpdateAddressCustomerDto: UpdateAddressCustomerDto,
  ) {
    return this.AddressCustomerService.update(+id, UpdateAddressCustomerDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string) {
    return this.AddressCustomerService.remove(+id);
  }
}
