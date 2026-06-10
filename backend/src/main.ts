import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT');

  if (!port) {
    throw new Error('PORT environment variable is not defined');
  }

  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
