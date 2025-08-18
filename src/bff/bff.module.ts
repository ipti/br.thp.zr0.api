import { Module } from '@nestjs/common';
import { AuxUserBffModule } from './aux_user_bff/aux_user_bff.module';
import { TransformationWorkshopBffModule } from './transformation_workshop_bff/transformation_workshop_bff.module';
import { UserBffModule } from './user_bff/user_bff.module';
import { TransformationWorkshopProductBffModule } from './transformation_workshop_product_bff/transformation_workshop_bff.module';
import { ProductBffModule } from './product_bff/product_bff.module';
import { OrdersBffModule } from './orders_bff/orders_bff.module';

@Module({
  imports: [
    AuxUserBffModule,
    TransformationWorkshopBffModule,
    TransformationWorkshopProductBffModule,
    UserBffModule,
    ProductBffModule,
    OrdersBffModule
  ],
})
export class BFFModule {}
