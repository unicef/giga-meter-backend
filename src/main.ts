import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { AllExceptionFilter } from './common/common.filter';

import * as Sentry from '@sentry/node';
import { CategoryGuard } from './common/category.guard';
import { CategoryResponseInterceptor } from './common/category.interceptor';
import { CATEGORIES, CATEGORY_CONFIG, DEFAULT_CATEGORY } from './common/category.config';
import { filterSwaggerDocByCategory } from './common/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Apply global guards
  app.useGlobalGuards(new CategoryGuard(app.get('Reflector')));
  
  // Apply global interceptors
  app.useGlobalInterceptors(new CategoryResponseInterceptor());

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
    .addServer('https://uni-ooi-giga-meter-backend.azurewebsites.net')
    .build();

  // Generate the base Swagger document
  const fullDocument = SwaggerModule.createDocument(app, baseConfig);
  
  // Create the different Swagger endpoints for different categories
  
  // Default API documentation (using default category from config)
  SwaggerModule.setup('api', app, filterSwaggerDocByCategory(fullDocument, DEFAULT_CATEGORY), {
    customCssUrl: '/swagger-custom.css',
    customJs: '/swagger-custom.js',
  });
  
  // setTimeout(() => {
  // Create a Swagger endpoint for each category
  console.log('Creating Swagger endpoints for categories...');
  CATEGORIES.forEach(category => {
    const config = CATEGORY_CONFIG[category];
    if (config && config.swagger.visible) {
      // Filter the Swagger document for this category
      const categoryDocument = filterSwaggerDocByCategory(fullDocument, category);
      
      // Set up the Swagger endpoint for this category
      SwaggerModule.setup(`api/${category}`, app, categoryDocument, {
          customCssUrl: '/swagger-custom.css',
          customJs: '/swagger-custom.js',
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }
  });
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

  app.useGlobalFilters(new AllExceptionFilter());

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
