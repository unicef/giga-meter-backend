import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { AllExceptionFilter } from './common/common.filter';
import {
  PrismaClientExceptionFilter,
  PrismaClientValidationErrorFilter,
} from './prisma/prisma-client-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const defaultConfig = new DocumentBuilder()
    .setTitle('Daily Check App API')
    .setDescription(
      'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.\n\n' +
        '<b>License</b>: The dataset accessed through this API is made available under the <a target="_blank" href="https://opendatacommons.org/licenses/odbl/1-0/">Open Data Commons Open Database License (ODbL)</a>. You are free to copy, distribute, transmit and adapt our data, as long as you credit Giga and its contributors. If you alter or build upon our data, you may distribute the result only under the same license. The full legal code explains your rights and responsibilities.',
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
    const defaultPaths = [
      '/api/v1/dailycheckapp_countries',
      '/api/v1/measurements',
      '/api/v1/dailycheckapp_schools',
    ];
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
    .setLicense(
      'Giga Meter data is made available under the Open Database License(ODBL)',
      'https://opendatacommons.org/licenses/odbl/',
    )
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

  if (process.env.NODE_ENV === 'development') {
    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT'],
      preflightContinue: false,
    });
  } else {
    app.enableCors({
      // origin: [
      //   'capacitor-electron://-',
      //   'https://meter.giga.global/',
      //   'https://uni-ooi-giga-daily-check-service-api-f0b8brh5b3hch8dq.a03.azurefd.net/',
      //   'https://uni-ooi-giga-daily-check-service-api.azurewebsites.net/',
      // ],
      origin: '*',
      methods: ['GET', 'POST', 'PUT'],
      preflightContinue: false,
    });
  }

  const { httpAdapter } = app.get(HttpAdapterHost);
  // app.useGlobalFilters(new AllExceptionFilter());
  app.useGlobalFilters(
    new AllExceptionFilter(),
    new PrismaClientExceptionFilter(httpAdapter),
    new PrismaClientValidationErrorFilter(httpAdapter),
  );

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration(), Sentry.prismaIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  dotenv.config();

  await app.listen(3000, () => {
    console.log('Server started on port 3000');
  });
}
bootstrap();
