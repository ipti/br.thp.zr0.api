import { PartialType } from '@nestjs/swagger';
import { CreateTransformationWorkshopDto } from './create-transformation_workshop.dto';

export class UpdateTransformationWorkshopDto extends PartialType(CreateTransformationWorkshopDto) {}
