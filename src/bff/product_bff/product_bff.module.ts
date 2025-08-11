import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductBffController } from './product_bff.controller';
import { ProductBffService } from './shared/product_bff.service';
import { ProductsService } from 'src/product/shared/product.service';
import { AzureProviderService } from 'src/utils/middleware/azure.provider';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), ],
  controllers: [ProductBffController],
  providers: [ProductBffService, ProductsService, AzureProviderService],
  exports: [ProductBffService],
})
export class ProductBffModule {}
