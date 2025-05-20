import { Module } from '@nestjs/common';
import { AuxUserBffModule } from './aux_user_bff/aux_user_bff.module';
import { TransformationWorkshopBffModule } from './transformation_workshop_bff/transformation_workshop_bff.module';

@Module({
  imports: [AuxUserBffModule, TransformationWorkshopBffModule],
})
export class BFFModule {}
