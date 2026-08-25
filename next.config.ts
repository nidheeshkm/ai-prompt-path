import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect old single-course routes to the new multi-course structure
      {
        source: '/learn/:chapterId(\\d+)',
        destination: '/learn/promptpath-starter/:chapterId',
        permanent: false,
      },
      {
        source: '/learn/:chapterId(\\d+)/:topicId',
        destination: '/learn/promptpath-starter/:chapterId/:topicId',
        permanent: false,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps when SENTRY_AUTH_TOKEN is present (CI/prod)
  ...(process.env.SENTRY_AUTH_TOKEN
    ? {
        sourcemaps: {
          filesToDeleteAfterUpload: ['.next/static/**/*.map'],
        },
      }
    : {}),

  // Suppress build output noise in dev
  silent: !process.env.CI,

  // Tree-shake Sentry logger calls in production bundles
  disableLogger: true,

  // Route Sentry telemetry through /monitoring to bypass ad-blockers
  tunnelRoute: '/monitoring',

  // Auto-instrument server components, API routes, and middleware
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

})
