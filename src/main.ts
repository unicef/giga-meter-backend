import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { AllExceptionFilter } from './common/common.filter';
import {
  PrismaClientExceptionFilter,
  PrismaClientValidationErrorFilter,
} from './prisma/prisma-client-exception.filter';
import helmet from 'helmet';
import * as express from 'express';

import * as Sentry from '@sentry/node';
import { CategoryConfigProvider } from './common/category-config.provider';
import { SwaggerAuthMiddleware } from './common/swagger-auth.middleware';
import { AuthGuard } from './auth/auth.guard';
import { filterSwaggerDocByCategory } from './common/swagger/swagger-filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure body parser limits to prevent DoS attacks
  app.use(express.json({ limit: '5mb' })); // Limit JSON body size
  app.use(express.urlencoded({ limit: '2mb', extended: true })); // Limit URL-encoded body size

  // Apply Helmet security headers middleware
  // Configure security headers to protect against common web vulnerabilities
  app.use(
    helmet({
      // Content Security Policy - Prevents XSS and code injection attacks
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"], // Only allow resources from same origin by default
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Swagger UI
            'https://unpkg.com', // Allow Swagger UI scripts
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Swagger UI
            'https://unpkg.com',
            'https://fonts.googleapis.com', // Allow Google Fonts
          ],
          imgSrc: [
            "'self'",
            'data:', // Allow data URLs for images
            'https:', // Allow HTTPS images
          ],
          objectSrc: ["'none'"], // Disable object, embed, and applet elements
          upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS automatically
        },
      },
      // Frame Guard - Prevents clickjacking attacks
      frameguard: { action: 'deny' },
      // Referrer Policy - Controls referrer information sent with requests
      referrerPolicy: { policy: 'same-origin' },
      // Cross-Origin Embedder Policy - Enables cross-origin isolation
      crossOriginEmbedderPolicy: true,
      // HTTP Strict Transport Security - Forces HTTPS connections
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true, // Apply to all subdomains
        preload: true, // Include in browser preload lists
      },
      // Hide X-Powered-By header to reduce information disclosure
      hidePoweredBy: true,
      // X-Content-Type-Options - Prevents MIME type sniffing
      noSniff: true,
      // X-XSS-Protection - Enables XSS filtering in older browsers
      xssFilter: true,
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Get the Category
  const categoryConfigProvider = app.get(CategoryConfigProvider);
  await categoryConfigProvider.initialize();
  const categories = await categoryConfigProvider.getCategories();

  const authGuard = app.get(AuthGuard);
  const swaggerMiddleware = new SwaggerAuthMiddleware(authGuard);

  const categoryPaths = categories.map((path) => `/api/${path}`);
  app.use(categoryPaths, swaggerMiddleware.use.bind(swaggerMiddleware));

  // Configure basic Swagger options
  const baseConfig = new DocumentBuilder()
    .setTitle('Giga Meter API')
    .setDescription(
      'API to query list schools and countries with GIGA Meter installed and their raw measurements indicators like download speed, latency, upload speed etc.\n\n' +
        '<b>License</b>: The dataset accessed through this API is made available under the <a target="_blank" href="https://opendatacommons.org/licenses/odbl/1-0/">Open Data Commons Open Database License (ODbL)</a>. You are free to copy, distribute, transmit and adapt our data, as long as you credit Giga and its contributors. If you alter or build upon our data, you may distribute the result only under the same license. The full legal code explains your rights and responsibilities.',
    )
    .setVersion('1.0')
    .setLicense(
      'Giga Meter data is made available under the Open Database License(ODBL)',
      'https://opendatacommons.org/licenses/odbl/',
    )
    .addBearerAuth({
      type: 'http',
      description: 'Enter api key',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .addServer(
      process.env.GIGA_METER_BE_HOST ||
        'https://uni-ooi-giga-meter-backend.azurewebsites.net',
    )
    .build();

  // Create a Swagger endpoint for each category
  const categoriesConfig = await categoryConfigProvider.getAllCategoryConfigs();
  for (const config of categoriesConfig) {
    if (config && config.swagger && config.swagger.visible) {
      // Filter the Swagger document for this category
      const freshDoc = SwaggerModule.createDocument(app, baseConfig);
      const categoryDocument = filterSwaggerDocByCategory(freshDoc, config);

      // Set up the Swagger endpoint for this category
      SwaggerModule.setup(`api/${config.name}`, app, categoryDocument, {
        customCssUrl: '/swagger-custom.css',
        customJs: '/swagger-custom.js',
        swaggerOptions: {},
      });
    }
  }
  if (process.env.NODE_ENV === 'development') {
    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT'],
      preflightContinue: false,
    });
  } else {
    const corsOptions = {
      origin: (origin, callback) => {
        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') {
          logger.log('[CORS] Devlopment mode - allowing all origins');
          return callback(null, true);
        }

        // In production, check against allowed origins
        const allowedOrigins = process.env.ALLOWED_HOSTS?.split('|') ?? [];

        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT'],
      preflightContinue: false,
      credentials: true,
    };

    app.enableCors(corsOptions);
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

  const logger = new Logger('Bootstrap');
  app.set('trust proxy', true);
  await app.listen(3000, () => {
    logger.log('Server started on port 3000');
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
bootstrap();
