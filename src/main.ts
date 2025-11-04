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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


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
