import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TransformationWorkshopService } from './transformation_workshop.service';
import { CreateTransformationWorkshopDto } from './dto/create-transformation_workshop.dto';
import { QueryTransformationWorkshopDto } from './dto/query-transformation_workshop.dto';
import { UpdateTransformationWorkshopDto } from './dto/update-transformation_workshop.dto';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('transformation-workshop')
export class TransformationWorkshopController {
  constructor(
    private readonly transformationWorkshopService: TransformationWorkshopService,
  ) {}

  @Post()
  create(
    @Body() createTransformationWorkshopDto: CreateTransformationWorkshopDto,
    @Req() req: Request,
  ) {
    return this.transformationWorkshopService.create(
      createTransformationWorkshopDto,
      req.user?.id ?? 1,
    );
  }

  @Get()
  findAll(@Query() query: QueryTransformationWorkshopDto) {
    return this.transformationWorkshopService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transformationWorkshopService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTransformationWorkshopDto: UpdateTransformationWorkshopDto,
  ) {
    return this.transformationWorkshopService.update(
      +id,
      updateTransformationWorkshopDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transformationWorkshopService.remove(+id);
  }
}
