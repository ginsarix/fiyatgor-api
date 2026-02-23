import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://de84c07f8d1971af311ea5f76dfab228@o4510351700066304.ingest.de.sentry.io/4510934482747472",
  // Send structured logs to Sentry
  enableLogs: true,
  // Tracing
  tracesSampleRate: 1.0,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
