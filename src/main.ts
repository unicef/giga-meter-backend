import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

async function bootstrap() {
  const config = new DocumentBuilder()
    .setTitle('GIGA Meter API')
    .setDescription(
      'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.',
    )
    .setVersion('1.0')
    .addTag('Contact Messages')
    .addTag('Flagged Schools')
    .addTag('Schools')
    .addTag('Country')
    .addBearerAuth({
      type: 'http',
      description: 'Enter api key',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();
  const app = await NestFactory.create(AppModule);
  const document = SwaggerModule.createDocument(app, config);

  dotenv.config();

  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
}
bootstrap();
