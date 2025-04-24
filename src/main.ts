import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { AllExceptionFilter } from './common/common.filter';
import {
  PrismaClientExceptionFilter,
  PrismaClientValidationErrorFilter,
} from './prisma/prisma-client-exception.filter';

import * as Sentry from '@sentry/node';
import { CategoryConfigProvider } from './common/category-config.provider';
import { SwaggerAuthMiddleware } from './common/swagger-auth.middleware';
import { AuthGuard } from './auth/auth.guard';
import { filterSwaggerDocByCategory } from './common/swagger/swagger-filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Get the Category
  const categoryConfigProvider = app.get(CategoryConfigProvider);
  await categoryConfigProvider.initialize();
  const categories = await categoryConfigProvider.getCategories();
  
  const authGuard = app.get(AuthGuard);
  const swaggerMiddleware = new SwaggerAuthMiddleware(authGuard);
  
  const categoryPaths = categories.map(path => `/api/${path}`);
  app.use(categoryPaths, swaggerMiddleware.use.bind(swaggerMiddleware));

  // Configure basic Swagger options
  const baseConfig = new DocumentBuilder()
  .setTitle('Giga Meter API')
  .setDescription(
      'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.\n\n' +
        '<b>License</b>: The dataset accessed through this API is made available under the <a target="_blank" href="https://opendatacommons.org/licenses/odbl/1-0/">Open Data Commons Open Database License (ODbL)</a>. You are free to copy, distribute, transmit and adapt our data, as long as you credit Giga and its contributors. If you alter or build upon our data, you may distribute the result only under the same license. The full legal code explains your rights and responsibilities.',    
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      description: 'Enter api key',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .addServer(process.env.GIGA_METER_BE_HOST || 'https://uni-ooi-giga-meter-backend.azurewebsites.net')
    .build();
  
  // Create a Swagger endpoint for each category
  const categoriesConfig = await categoryConfigProvider.getAllCategoryConfigs();
  // setTimeout(() => {
  for (const config of categoriesConfig) {
    if (config && config.swagger && config.swagger.visible) {
      // Filter the Swagger document for this category
      const freshDoc = SwaggerModule.createDocument(app, baseConfig);
      const categoryDocument = filterSwaggerDocByCategory(freshDoc, config);
      
      // Set up the Swagger endpoint for this category
      SwaggerModule.setup(`api/${config.name}`, app, categoryDocument, {
        customCssUrl: '/swagger-custom.css',
        customJs: '/swagger-custom.js',
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }
  }
  // }, 10000)
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
  app.useGlobalFilters(
    new AllExceptionFilter(),
    new PrismaClientExceptionFilter(httpAdapter),
    new PrismaClientValidationErrorFilter(httpAdapter),
  );

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Performance Monitoring
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV ?? 'production',
  });

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request  
  app.use(Sentry.Handlers.tracingHandler());
  dotenv.config();

  await app.listen(3000, () => {
    console.log('Server started on port 3000');
  });
}
bootstrap();
