import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import { getAdminAuthConfig } from "@/lib/env";
import {
  authenticateAdminToken,
  hashClientAddress,
  loginAdmin,
  logoutAdmin,
  requireAdminToken,
  SESSION_COOKIE_NAME,
  type AuthenticatedAdmin,
  type LoginResult,
} from "@/modules/admin";
import { getPrisma } from "@/server/db";
import { PrismaAdminRepository } from "@/server/repositories/admin-repository";

/**
 * Admin session plumbing (REQ-046).
 *
 * Every admin page and every admin API route resolves its caller here. The
 * cookie is the only accepted credential: an admin id in a body or query string
 * is never an authorization signal.
 */

export { SESSION_COOKIE_NAME };

function repository() {
  return new PrismaAdminRepository(getPrisma());
}

function authConfig() {
  return getAdminAuthConfig();
}

/**
 * Cookie attributes for the session.
 *
 * `httpOnly` keeps it away from any script, `sameSite: "lax"` stops a
 * cross-site form post from acting as the admin, and `secure` is on wherever
 * the app is served over HTTPS (staging and production).
 */
function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: authConfig().secureCookie,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Read the raw session token from the request cookies. */
export async function readAdminSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/** Resolve the signed-in admin, or `null`. Used by pages to redirect. */
export async function getAdminSession(): Promise<AuthenticatedAdmin | null> {
  return authenticateAdminToken(repository(), await readAdminSessionToken());
}

/** Resolve the signed-in admin, or throw 401. Used by admin API routes. */
export async function requireAdminSession(): Promise<AuthenticatedAdmin> {
  return requireAdminToken(repository(), await readAdminSessionToken());
}

/** Client address for throttling. Hashed immediately; the raw IP is not stored. */
export function clientAddressHash(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return hashClientAddress(first ?? request.headers.get("x-real-ip"));
}

export async function performAdminLogin(
  request: Request,
  input: unknown,
): Promise<LoginResult> {
  return loginAdmin(repository(), authConfig(), input, {
    ipHash: clientAddressHash(request),
    userAgent: request.headers.get("user-agent"),
  });
}

export async function performAdminLogout(): Promise<void> {
  await logoutAdmin(repository(), await readAdminSessionToken());
}

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions(authConfig().sessionTtlSeconds));
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", cookieOptions(0));
  return response;
}

/**
 * Page-level guard for `/admin/*` (REQ-046).
 *
 * Returns the signed-in admin, or redirects to the login form with the intended
 * path attached. Every protected page calls this before it renders anything, so
 * authorization is a server decision — never a hidden link in the UI.
 */
export async function requireAdminPage(currentPath: string): Promise<AuthenticatedAdmin> {
  const session = await getAdminSession();
  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(currentPath)}`);
  }
  return session;
}
