import * as dotenv from 'dotenv';

import * as Sentry from '@sentry/nestjs';
import '@sentry/profiling-node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';


if (!process.env.SENTRY_DSN) {
  // eslint-disable-next-line no-console
  console.warn('[Sentry] SENTRY_DSN not set — Sentry is disabled');
}



Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  debug: false, // remove once verified
  release: "2.0.3",
  integrations: [
    // Add our Profiling integration
    nodeProfilingIntegration(),
  ],
});

dotenv.config();