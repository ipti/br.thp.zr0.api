import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    console.log("PRISMA INIT");
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    console.log("PRISMA Shutdown");
    this.$on('beforeExit', async () => {
      console.log("PRISMA Close");
      await app.close();
    });
  }
}
