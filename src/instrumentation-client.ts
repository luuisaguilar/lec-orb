// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  enableLogs: true,
  debug: false,
  beforeSend(event) {
    if (typeof window === "undefined") return event;
    const path = window.location?.pathname ?? "";
    if (path.includes("/dashboard/finanzas") || path.includes("/api/v1/finance")) {
      event.tags = { ...event.tags, module: "finanzas" };
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
