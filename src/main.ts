import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Logs JSON structurés en production (agrégation/parsing), lisibles en dev.
    logger:
      process.env.NODE_ENV === 'production' ? new ConsoleLogger({ json: true }) : undefined,
  });

  // Fail-fast : vérifie les secrets après que ConfigModule ait chargé le .env
  const configService = app.get(ConfigService);
  configService.getOrThrow('JWT_ACCESS_SECRET');
  configService.getOrThrow('JWT_REFRESH_SECRET');

  app.use(helmet());

  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || true,
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GardenMate API')
    .setDescription('API documentation for GardenMate API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

  Logger.log(`GardenMate API started on port ${port}`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error("Error starting the application", error, "Bootstrap");
  process.exit(1);
});
