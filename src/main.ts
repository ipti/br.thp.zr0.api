import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import * as session from 'express-session';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import * as bodyParser from 'body-parser';


import 'dotenv/config'; // ou:
import * as dotenv from 'dotenv';
dotenv.config();

declare const module: any;

// Startup logging and global error handlers to help diagnose production startup failures.
process.on('uncaughtException', (err) => {
  console.error('uncaughtException -', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection -', reason);
});

async function bootstrap() {
  console.log('Starting application...');
  console.log('NODE_ENV=', process.env.NODE_ENV ?? 'undefined');
  console.log('APP_PORT=', process.env.APP_PORT ?? 3000);
  try {
    // Redact DATABASE_URL in logs but indicate presence
    const hasDb = !!process.env.DATABASE_URL;
    console.log('DATABASE_URL present=', hasDb);
  } catch (e) {
    console.warn('Failed to read DATABASE_URL presence', e);
  }

  const app = await NestFactory.create(AppModule);

  // Quick health check for Prisma/DB connection early in startup
  try {
    const prismaService = app.get(PrismaService);
    // small ping query
    await prismaService.$queryRaw`SELECT 1`;
    console.log('Database ping successful');
  } catch (err) {
    console.error('Database ping failed during startup:', err);
  }

  app.enableCors({
    credentials: true,
    origin: async (
      requestOrigin: string,
      next: (err: Error | null, origin?: string[]) => void,
    ) => {
      const origins = await app.get(AppService).getOrigins();
      next(null, origins);
    },
  });

  
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.use('/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

  // ✅ Use o JSON parser normalmente nas demais rotas
  app.use(bodyParser.json());

  const options = new DocumentBuilder()
    .setTitle('Tecnologia Zr0')
    .setDescription('API do sistema Zr0 desenvolvido pelo THP.')
    .setVersion(process.env.npm_package_version ?? "")
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  await app.listen(process.env.APP_PORT || 3000);
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
