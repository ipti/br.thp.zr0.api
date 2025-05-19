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

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true }),
    PrometheusModule.register(),
    UsersModule,
    AuthModule,
    BFFModule,
    PrtoductModule,
    PrismaModule,
    CategoryModule,
    StateModule,
    CityModule,
    TransformationWorkshopModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes('*');
  }
}