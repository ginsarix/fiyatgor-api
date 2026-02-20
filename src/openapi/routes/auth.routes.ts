import { createRoute } from "@hono/zod-openapi";
import {
  LoginBodySchema,
  MessageSchema,
  SessionResponseSchema,
} from "../schemas.js";

export const loginRoute = createRoute({
  method: "post",
  path: "/auth/sessions",
  tags: ["Auth"],
  summary: "Login",
  description: "Authenticate with e-mail and password. Sets a `session` cookie on success.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginBodySchema,
        },
      },
      required: true,
      description: "User credentials",
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Login successful",
    },
    401: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Invalid e-mail or password",
    },
    403: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Session could not be created (already logged in)",
    },
    404: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Firm associated with user not found",
    },
    422: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Validation error",
    },
  },
});

export const getCurrentSessionRoute = createRoute({
  method: "get",
  path: "/auth/sessions/current",
  tags: ["Auth"],
  summary: "Get current session",
  description: "Returns the session data for the currently authenticated user.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: SessionResponseSchema } },
      description: "Session retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: MessageSchema } },
      description: "No active session found",
    },
  },
});

export const logoutRoute = createRoute({
  method: "delete",
  path: "/auth/sessions/current",
  tags: ["Auth"],
  summary: "Logout",
  description: "Destroys the current session and clears the `session` cookie.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Logged out successfully",
    },
  },
});
