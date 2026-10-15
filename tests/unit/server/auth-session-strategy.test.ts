/**
 * Regression tests for the Auth.js session strategy decision.
 *
 * Auth.js refuses to start when the session strategy is "database" and every
 * configured provider is of type "credentials". It returns `UnsupportedStrategy`
 * from `assertConfig`, which surfaces on every `/api/auth/*` request as a 500
 * with "There was a problem with the server configuration."
 *
 * kinfolk production hits exactly that shape: `DATABASE_URL` is set (so the
 * Drizzle adapter and the database strategy are selected) while the only
 * enabled Auth.js provider is credentials, because no OAuth client ids are set
 * and the Resend provider is development-only.
 *
 * @see https://authjs.dev/reference/core/errors#unsupportedstrategy
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { describe, expect, it } from "vitest";
import { resolveSessionStrategy } from "@/server/auth-js/auth-providers-utils";

const credentialsProvider = Credentials({
  name: "credentials",
  credentials: { email: {}, password: {} },
  authorize: async () => null,
});

const guestProvider = Credentials({
  id: "guest",
  name: "guest",
  credentials: { name: {} },
  authorize: async () => null,
});

const githubProvider = GitHub({ clientId: "id", clientSecret: "secret" });

/** Minimal adapter satisfying the methods Auth.js requires for database sessions. */
const adapterStub = {
  createUser: async () => null,
  getUser: async () => null,
  getUserByEmail: async () => null,
  getUserByAccount: async () => null,
  updateUser: async () => null,
  linkAccount: async () => null,
  createSession: async () => null,
  getSessionAndUser: async () => null,
  updateSession: async () => null,
  deleteSession: async () => null,
} as any;

const sessionRequest = () => new Request("https://kinfolk.lacy.sh/api/auth/session");

describe("resolveSessionStrategy", () => {
  it("falls back to jwt when credentials is the only provider type", () => {
    expect(resolveSessionStrategy([credentialsProvider], true)).toBe("jwt");
  });

  it("treats the guest provider as credentials too", () => {
    expect(resolveSessionStrategy([credentialsProvider, guestProvider], true)).toBe("jwt");
  });

  it("uses the database strategy once a non-credentials provider is enabled", () => {
    expect(resolveSessionStrategy([credentialsProvider, githubProvider], true)).toBe("database");
  });

  it("stays on jwt when no database adapter is available", () => {
    expect(resolveSessionStrategy([githubProvider], false)).toBe("jwt");
  });

  // Auth.js only runs its credentials check when it saw a credentials provider,
  // so an empty list must keep the strategy it had before this fix.
  it("keeps the database strategy for an empty provider list", () => {
    expect(resolveSessionStrategy([], true)).toBe("database");
  });

  it("resolves providers declared as functions", () => {
    expect(resolveSessionStrategy([() => credentialsProvider], true)).toBe("jwt");
    expect(resolveSessionStrategy([() => githubProvider], true)).toBe("database");
  });
});

describe("/api/auth/session with a credentials-only provider list", () => {
  it("serves 200 when the strategy is resolved from the provider list", async () => {
    const { handlers } = NextAuth({
      trustHost: true,
      secret: "test-secret-value",
      providers: [credentialsProvider],
      adapter: adapterStub,
      session: { strategy: resolveSessionStrategy([credentialsProvider], true) },
    });

    const response = await handlers.GET(sessionRequest() as any);

    expect(response.status).toBe(200);
  });

  it("would 500 on the unchecked database strategy (guards the regression)", async () => {
    const { handlers } = NextAuth({
      trustHost: true,
      secret: "test-secret-value",
      providers: [credentialsProvider],
      adapter: adapterStub,
      session: { strategy: "database" },
    });

    const response = await handlers.GET(sessionRequest() as any);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining("problem with the server configuration"),
    });
  });
});
