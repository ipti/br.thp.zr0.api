import { Module } from '@nestjs/common';
import { StateModule } from 'src/edcensoUf/edcensouf.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CityController } from './city.controller';
import { CityService } from './shared/city.service';

@Module({
  imports: [
    StateModule,
    PrismaModule
  ],
  controllers: [CityController],
  providers: [CityService],
  exports: [CityService],
})
export class CityModule { }
