import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { AllExceptionFilter } from './common/common.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const defaultConfig = new DocumentBuilder()
    .setTitle('GIGA Meter API')
    .setDescription(
      'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.',
    )
    .setVersion('1.0')
    .addTag('Schools')
    .addTag('Country')
    .addTag('Measurements')
    .addBearerAuth({
      type: 'http',
      description: 'Enter api key',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();
  const defaultDocument = SwaggerModule.createDocument(app, defaultConfig);

  app.use('/api', (req: Request, res, next) => {
    const showAll = req.url.includes('?show_all=true');
    const defaultPaths = [
      '/api/v1/dailycheckapp_countries',
      '/api/v1/measurements',
      '/api/v1/dailycheckapp_schools',
    ];
    if (!showAll) {
      defaultDocument.paths = Object.keys(defaultDocument.paths)
        .filter((path) => defaultPaths.includes(path))
        .filter((path) => {
          const pathObj = defaultDocument.paths[path];
          delete pathObj.post;
          return defaultPaths.includes(path);
        })
        .reduce(
          (acc, path) => ({ ...acc, [path]: defaultDocument.paths[path] }),
          {},
        );
      delete defaultDocument.components.schemas['MessagesDto'];
      delete defaultDocument.components.schemas['FlaggedSchoolDto'];
      delete defaultDocument.components.schemas['FeatureFlagDto'];
      delete defaultDocument.components.schemas['MeasurementV2Dto'];
      delete defaultDocument.components.schemas['SchoolMasterDto'];
      delete defaultDocument.components.schemas['MetricsDto'];
    }
    next();
  });

  SwaggerModule.setup('api', app, defaultDocument, {
    customCssUrl: '/swagger-custom.css',
    customJs: '/swagger-custom.js',
  });

  const allConfig = new DocumentBuilder()
    .setTitle('GIGA Meter API')
    .setDescription(
      'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.',
    )
    .setVersion('1.0')
    .addTag('Contact Messages')
    .addTag('Flagged Schools')
    .addTag('Schools')
    .addTag('SchoolsMaster')
    .addTag('Country')
    .addTag('Measurements')
    .addBearerAuth({
      type: 'http',
      description: 'Enter api key',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();
  const allDocument = SwaggerModule.createDocument(app, allConfig);

  SwaggerModule.setup('api/all', app, allDocument, {
    customCssUrl: '/swagger-custom.css',
    customJs: '/swagger-custom.js',
  });

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: '*',
  });

  app.useGlobalFilters(new AllExceptionFilter());

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      // Add our Profiling integration
      nodeProfilingIntegration(),
      Sentry.prismaIntegration(),
    ],

    // Add Tracing by setting tracesSampleRate
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

    // Set sampling rate for profiling
    // This is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });

  dotenv.config();
  await app.listen(3000);
}
bootstrap();
