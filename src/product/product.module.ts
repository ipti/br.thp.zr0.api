import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductController } from './product.controller';
import { ProductsService } from './shared/product.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class PrtoductModule {}
