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

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true }),
    PrometheusModule.register(),
    UsersModule,
    AuthModule,
    BFFModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes('*');
  }
}