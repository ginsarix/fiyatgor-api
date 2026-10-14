import * as Sentry from "@sentry/node";
import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { DiaLoginError } from "../helpers/dia.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse(); // Don't report expected HTTP errors
  }

  // bad or missing DIA credentials, the user has to fix them so there is nothing to report
  if (err instanceof DiaLoginError) {
    return c.json({ message: err.message }, 422);
  }

  console.error(err);
  const eventId = Sentry.captureException(err, {
    extra: {
      method: c.req.method,
      path: c.req.path,
    },
  }); // Only report true unknowns

  return c.json({ error: "Internal server error", requestId: eventId }, 500);
};
