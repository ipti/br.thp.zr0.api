import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductController } from './product.controller';
import { ProductsService } from './shared/product.service';
import { AzureProviderService } from 'src/utils/middleware/azure.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true, // Importante para tornar o ConfigService global
    }),
  ],
  controllers: [ProductController],
  providers: [ProductsService, AzureProviderService],
  exports: [ProductsService],
})
export class PrtoductModule {}
