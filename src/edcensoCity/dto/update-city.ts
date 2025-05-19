import { PartialType } from '@nestjs/mapped-types';
import { CreateEdcensoCityDto } from './create-city.dto';

export class UpdateEdcensoCityDto extends PartialType(CreateEdcensoCityDto) {}
