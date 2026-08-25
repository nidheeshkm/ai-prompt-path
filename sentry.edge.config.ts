import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Keep edge traces cheap
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  debug: false,
})
