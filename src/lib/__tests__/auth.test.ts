// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

// Mock server-only so the import doesn't throw in test environment
vi.mock("server-only", () => ({}));

// Shared cookie store state for tests
let cookieStore: Map<string, string>;

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value !== undefined ? { name, value } : undefined;
      },
      set: (name: string, value: string) => {
        cookieStore.set(name, value);
      },
      delete: (name: string) => {
        cookieStore.delete(name);
      },
    }),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeValidToken(
  userId: string,
  email: string,
  expiresAt: Date
): Promise<string> {
  return new SignJWT({ userId, email, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

function makeNextRequest(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === "auth-token" && token ? { name, value: token } : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  cookieStore = new Map();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- createSession ---

test("createSession sets auth-token cookie", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-1", "user@example.com");

  const token = cookieStore.get("auth-token");
  expect(token).toBeDefined();

  const { payload } = await jwtVerify(token!, JWT_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("user@example.com");
});

test("createSession token expires in ~7 days", async () => {
  const { createSession } = await import("@/lib/auth");
  const before = Date.now();

  await createSession("user-1", "user@example.com");

  const token = cookieStore.get("auth-token")!;
  const { payload } = await jwtVerify(token, JWT_SECRET);

  const expMs = (payload.exp as number) * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 5000);
  expect(expMs).toBeLessThanOrEqual(before + sevenDaysMs + 5000);
});

// --- getSession ---

test("getSession returns null when no cookie is present", async () => {
  const { getSession } = await import("@/lib/auth");

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const { createSession, getSession } = await import("@/lib/auth");

  await createSession("user-1", "user@example.com");
  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-1");
  expect(session!.email).toBe("user@example.com");
});

test("getSession returns null for an invalid/tampered token", async () => {
  const { getSession } = await import("@/lib/auth");

  cookieStore.set("auth-token", "not.a.valid.jwt");
  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for a token signed with a different secret", async () => {
  const { getSession } = await import("@/lib/auth");

  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "u", email: "e@e.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(wrongSecret);

  cookieStore.set("auth-token", token);
  const session = await getSession();

  expect(session).toBeNull();
});

// --- deleteSession ---

test("deleteSession removes the auth-token cookie", async () => {
  const { createSession, deleteSession } = await import("@/lib/auth");

  await createSession("user-1", "user@example.com");
  expect(cookieStore.has("auth-token")).toBe(true);

  await deleteSession();

  expect(cookieStore.has("auth-token")).toBe(false);
});

test("deleteSession does not throw when no cookie exists", async () => {
  const { deleteSession } = await import("@/lib/auth");

  await expect(deleteSession()).resolves.toBeUndefined();
});

// --- verifySession ---

test("verifySession returns null when request has no auth-token cookie", async () => {
  const { verifySession } = await import("@/lib/auth");

  const session = await verifySession(makeNextRequest());

  expect(session).toBeNull();
});

test("verifySession returns session payload for a valid token in the request", async () => {
  const { verifySession } = await import("@/lib/auth");

  const token = await makeValidToken("user-2", "b@b.com", new Date());
  const session = await verifySession(makeNextRequest(token));

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-2");
  expect(session!.email).toBe("b@b.com");
});

test("verifySession returns null for an invalid token in the request", async () => {
  const { verifySession } = await import("@/lib/auth");

  const session = await verifySession(makeNextRequest("bad.token.here"));

  expect(session).toBeNull();
});

test("verifySession returns null for a token signed with a different secret", async () => {
  const { verifySession } = await import("@/lib/auth");

  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "u", email: "e@e.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(wrongSecret);

  const session = await verifySession(makeNextRequest(token));

  expect(session).toBeNull();
});
