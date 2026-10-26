import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Cloud Run fournit le port dans PORT (8080 par défaut)
  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
