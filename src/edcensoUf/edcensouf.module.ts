import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StateController } from './edcensouf.controller';
import { stateService } from './shared/state.service';

@Module({
  imports: [PrismaModule],
  controllers: [StateController],
  providers: [stateService],
  exports: [stateService],
})
export class StateModule {}
