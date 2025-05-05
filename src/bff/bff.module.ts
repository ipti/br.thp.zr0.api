import { Module } from '@nestjs/common';
import { AuxUserBffModule } from './aux_user_bff/aux_user_bff.module';

@Module({
  imports: [AuxUserBffModule],
})
export class BFFModule {}
