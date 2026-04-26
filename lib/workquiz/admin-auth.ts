import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "workquiz_admin_session";
const ADMIN_LOGIN_PATH = "/admin-login";
const DEFAULT_ADMIN_REDIRECT = "/admin";

type AdminSignInResult =
  | { ok: true }
  | { ok: false; reason: "config" | "invalid" };

function getConfiguredCredentials() {
  const username = process.env.WORKQUIZ_ADMIN_USERNAME?.trim();
  const password = process.env.WORKQUIZ_ADMIN_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function signValue(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.WORKQUIZ_SECRET ?? "dev-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function isAdminAuthConfigured() {
  return getConfiguredCredentials() !== null;
}

export async function buildExpectedAdminSessionValue() {
  const credentials = getConfiguredCredentials();
  if (!credentials) {
    return null;
  }

  return signValue(`workquiz-admin:${credentials.username}:${credentials.password}`);
}

export async function hasValidAdminSessionValue(sessionValue?: string | null) {
  const expectedValue = await buildExpectedAdminSessionValue();
  if (!expectedValue || !sessionValue) {
    return false;
  }

  return safeEqual(expectedValue, sessionValue);
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  return hasValidAdminSessionValue(jar.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function signInAdmin(username: string, password: string): Promise<AdminSignInResult> {
  const credentials = getConfiguredCredentials();
  if (!credentials) {
    return { ok: false, reason: "config" };
  }

  if (!safeEqual(username.trim(), credentials.username) || !safeEqual(password, credentials.password)) {
    return { ok: false, reason: "invalid" };
  }

  const jar = await cookies();
  const sessionValue = await buildExpectedAdminSessionValue();
  if (!sessionValue) {
    return { ok: false, reason: "config" };
  }

  jar.set(ADMIN_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return { ok: true };
}

export function sanitizeAdminRedirectTarget(target?: string | null) {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return DEFAULT_ADMIN_REDIRECT;
  }

  try {
    const url = new URL(target, "http://workquiz.local");
    if (url.origin !== "http://workquiz.local") {
      return DEFAULT_ADMIN_REDIRECT;
    }

    if (url.pathname.startsWith("/api/")) {
      return DEFAULT_ADMIN_REDIRECT;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_ADMIN_REDIRECT;
  }
}

export function buildAdminLoginRedirect(target?: string | null, error?: string) {
  const next = sanitizeAdminRedirectTarget(target);
  const params = new URLSearchParams();
  params.set("next", next);
  if (error) {
    params.set("error", error);
  }

  return `${ADMIN_LOGIN_PATH}?${params.toString()}`;
}

export const ADMIN_AUTH = {
  loginPath: ADMIN_LOGIN_PATH,
  sessionCookie: ADMIN_SESSION_COOKIE,
};
