import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtMiddleware } from './utils/middleware/jwt.middleware';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { BFFModule } from './bff/bff.module';
import { PrtoductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { TransformationWorkshopModule } from './transformation_workshop/transformation_workshop.module';
import { StateModule } from './edcensoUf/edcensouf.module';
import { CityModule } from './edcensoCity/city.module';
import { ProductVariantModule } from './product-variant/product-variant.module';
import { OrdersModule } from './orders/orders.module';
import { CheckoutModule } from './checkout/checkout.module';
import { ShippingModule } from './shipping/shipping.module';
import { CustomerModule } from './customer/customer.module';
import { BillingAddressCustomerModule } from './billing_address_customer/billing_address_customer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true }),
    PrometheusModule.register(),
    UsersModule,
    AuthModule,
    PrtoductModule,
    PrismaModule,
    CategoryModule,
    StateModule,
    CityModule,
    TransformationWorkshopModule,
    BFFModule,
    ProductVariantModule,
    OrdersModule,
    CheckoutModule,
    ShippingModule,
    CustomerModule,
    BillingAddressCustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes('*');
  }
}