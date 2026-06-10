import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRequiredPort } from './bootstrap';

async function bootstrap() {
  const port = getRequiredPort(process.env);
  const app = await NestFactory.create(AppModule);
  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
