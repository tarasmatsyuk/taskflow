import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Strip unknown fields, reject extras, and coerce types from JSON.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // One consistent error shape for HTTP + Prisma errors.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Let Prisma close its connection cleanly on app shutdown.
  app.enableShutdownHooks();

  // OpenAPI docs. Global prefix isn't applied to the UI route, so set it
  // explicitly → served at /api/docs (JSON at /api/docs-json).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription('TaskFlow REST API — projects (M1), more to come.')
    .setVersion('1.0')
    .addTag('projects')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  const port = process.env.PORT || 3333;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
