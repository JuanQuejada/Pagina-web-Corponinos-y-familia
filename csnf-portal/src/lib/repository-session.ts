import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SECONDS = 5 * 60;
const COOKIE_NAME = "csnf_repository_session";

type RepositorySession = {
  profileId: string;
  expiresAt: number;
};

function getSecret() {
  const secret =
    process.env.REPOSITORY_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Falta REPOSITORY_SESSION_SECRET o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return secret;
}

export function repositoryCookieName() {
  return COOKIE_NAME;
}

export function repositoryTtlSeconds() {
  const value = Number(
    process.env.REPOSITORY_SESSION_TTL_SECONDS || DEFAULT_TTL_SECONDS
  );

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_TTL_SECONDS;
  }

  return Math.floor(value);
}

function base64url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(value: string) {
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createRepositoryToken(profileId: string) {
  const cleanProfileId = String(profileId || "").trim();

  if (!cleanProfileId) {
    throw new Error("No se puede crear una sesión de repositorio sin usuario.");
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) + repositoryTtlSeconds();

  const payload = base64url(
    JSON.stringify({
      profileId: cleanProfileId,
      expiresAt,
    })
  );

  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function getRepositoryTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const index = cookie.indexOf("=");

    if (index === -1) continue;

    const name = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();

    if (name === repositoryCookieName()) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

export function verifyRepositoryToken(
  token: string | null | undefined
): RepositorySession | null {
  if (!token) return null;

  try {
    const parts = token.split(".");

    if (parts.length !== 2) return null;

    const [payload, providedSignature] = parts;

    const expectedSignature = sign(payload);

    const providedBuffer = Buffer.from(providedSignature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    const parsed = JSON.parse(fromBase64url(payload));

    const profileId = String(parsed?.profileId || "").trim();
    const expiresAt = Number(parsed?.expiresAt);

    if (!profileId || !Number.isFinite(expiresAt)) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    if (expiresAt <= now) {
      return null;
    }

    return {
      profileId,
      expiresAt,
    };
  } catch {
    return null;
  }
}