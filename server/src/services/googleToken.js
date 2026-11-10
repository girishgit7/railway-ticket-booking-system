import { createPublicKey, verify as verifySignature } from "node:crypto";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let cachedKeys = null;
let keysExpireAt = 0;

async function getGoogleKeys(forceRefresh = false) {
  if (!forceRefresh && cachedKeys && Date.now() < keysExpireAt) return cachedKeys;

  const response = await fetch(GOOGLE_CERTS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Unable to retrieve Google's signing keys");

  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error("Google signing keys response was invalid");

  const cacheControl = response.headers.get("cache-control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] || 300);
  cachedKeys = body.keys;
  keysExpireAt = Date.now() + Math.min(Math.max(maxAge, 60), 3600) * 1000;
  return cachedKeys;
}

export async function verifyGoogleCredential(token, clientId) {
  if (typeof token !== "string" || token.length > 10000 || !clientId) {
    throw new Error("Invalid Google credential");
  }

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed Google credential");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Unsupported Google credential signature");
  }

  let keys = await getGoogleKeys();
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) {
    keys = await getGoogleKeys(true);
    jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  }
  if (!jwk) throw new Error("Google signing key was not found");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`);
  const signature = Buffer.from(encodedSignature, "base64url");
  if (!verifySignature("RSA-SHA256", signingInput, publicKey, signature)) {
    throw new Error("Google credential signature is invalid");
  }

  const now = Math.floor(Date.now() / 1000);
  const audienceMatches = payload.aud === clientId ||
    (Array.isArray(payload.aud) && payload.aud.includes(clientId));
  const authorizedPartyMatches = !Array.isArray(payload.aud) || payload.aud.length === 1 || payload.azp === clientId;
  const issuerMatches = payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com";

  if (!issuerMatches || !audienceMatches || !authorizedPartyMatches ||
      !Number.isFinite(payload.exp) || payload.exp <= now ||
      !Number.isFinite(payload.iat) || payload.iat > now + 60 ||
      typeof payload.sub !== "string" || !payload.sub ||
      typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Google credential claims failed validation");
  }

  return payload;
}
