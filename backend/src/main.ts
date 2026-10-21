import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import {
  SwaggerModule,
  DocumentBuilder,
  type OpenAPIObject,
} from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT');

  if (!port) {
    throw new Error('PORT environment variable is not defined');
  }

  app.use(helmet());

  app.enableCors({
    origin: configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    ),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const swaggerConfig: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
    .setTitle('Manga Reader API')
    .setDescription('API for the Manga Reader application')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
