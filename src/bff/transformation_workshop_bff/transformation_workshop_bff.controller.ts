import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TransformationWorkshopBffService } from './shared/transformation_workshop_bff.service';
import { AddUserTransformationWorkshopDto } from './dto/transformation_workshop_add_user.dto';

@ApiTags('Transformation-Workshop-User-Bff')
@Controller('transformation-workshop-user-bff')
export class TransformationWorkshopBffController {
  constructor(
    private readonly transformationWorkshopBffService: TransformationWorkshopBffService,
  ) { }

  @Get('')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async transformationWorkshopUser(@Req() req: Request) {
    return this.transformationWorkshopBffService.transformationWorkshopUser(
      req.user?.id ?? 1,
    );
  }

  @Get('one')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async transformationWorkshopOne(@Query('id') id: number) {
    return this.transformationWorkshopBffService.transformationWorkshopOne(id);
  }

  @Get('members')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async transformationWorkshopMembers(@Query('id') id: number) {
    return this.transformationWorkshopBffService.getMemberTransformationWorkshop(
      id,
    );
  }

  @Get('product')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async transformationWorkshopProduct(@Query('id') id: number) {
    return this.transformationWorkshopBffService.getPoductTransformationWorkshop(
      id,
    );
  }

  @Get('order')
  @ApiCreatedResponse()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async transformationWorkshopOrder(
    @Query('id') id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.transformationWorkshopBffService.getOrdersTransformationWorkshop(
      id,
      page,
      limit,
    );
  }

  @Post('add-user')
  create(@Body() body: AddUserTransformationWorkshopDto, @Req() req: Request) {
    return this.transformationWorkshopBffService.addUserTransformationWorkshop(
      body,
    );
  }
}
