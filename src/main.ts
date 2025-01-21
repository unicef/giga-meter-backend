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
    .setTitle('Daily Check App API')
    .setDescription(
      'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.\n\n' +
      'License: This database accessed through the GigaMeter API is made available under the Open Database License.  \n' +
      'Any rights in individual contents of the database are licensed under the Database Content License.'
    )
    .setVersion('1.0')
    .setLicense(
      'Daily Check App data is made available under the Open Database License(ODBL)',
      'https://opendatacommons.org/licenses/odbl/',
    )
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

  app.useGlobalFilters(new AllExceptionFilter());

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration(), Sentry.prismaIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  dotenv.config();
  await app.listen(3000);
}
bootstrap();
