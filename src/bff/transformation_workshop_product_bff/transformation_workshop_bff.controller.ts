import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AddProductTransformationWorkshopDto } from './dto/transformation_workshop_add_user.dto';
import { TransformationWorkshopProductBffService } from './shared/transformation_workshop_bff.service';

@ApiTags('Transformation-Workshop-Product-Bff')
@Controller('transformation-workshop-product-bff')
// @ApiBearerAuth('access-token')
// @UseGuards(JwtAuthGuard)
export class TransformationWorkshopProductBffController {
  constructor(
    private readonly transformationWorkshopProductBffService: TransformationWorkshopProductBffService,
  ) { }

  @Get(':idTw')
  @ApiCreatedResponse()
  async transformationWorkshopProduct(@Param('idTw') idTw: string) {
    return this.transformationWorkshopProductBffService.transformationWorkshopProduct(
      idTw,
    );
  }



  @Post('add-product')
  create(
    @Body() body: AddProductTransformationWorkshopDto
  ) {
    return this.transformationWorkshopProductBffService.addProductTransformationWorkshop(
      body,
    );
  }

  @Delete()
  @ApiCreatedResponse()
  async removeTransformationWorkshopProduct(@Query('idTw') idTw: string) {
    console.log(idTw)
    return this.transformationWorkshopProductBffService.removeProductTransformationWorkshop(
      idTw,
    );
  }
}
