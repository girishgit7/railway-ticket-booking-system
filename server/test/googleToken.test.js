import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyGoogleCredential } from "../src/services/googleToken.js";

function createToken(privateKey, payload, kid = "test-google-key") {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${header}.${body}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

test("Google ID token verification checks signature, audience and verified email", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-google-key", alg: "RS256", use: "sig" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), {
    status: 200,
    headers: { "cache-control": "public, max-age=300", "content-type": "application/json" },
  });

  const now = Math.floor(Date.now() / 1000);
  const validPayload = {
    iss: "https://accounts.google.com",
    aud: "railconnect-test-client-id",
    sub: "google-user-123",
    email: "passenger@example.com",
    email_verified: true,
    iat: now,
    exp: now + 300,
  };

  try {
    const valid = await verifyGoogleCredential(createToken(privateKey, validPayload), "railconnect-test-client-id");
    assert.equal(valid.sub, "google-user-123");

    await assert.rejects(
      verifyGoogleCredential(createToken(privateKey, { ...validPayload, aud: "another-client" }), "railconnect-test-client-id"),
      /claims failed validation/,
    );

    await assert.rejects(
      verifyGoogleCredential(createToken(privateKey, { ...validPayload, email_verified: false }), "railconnect-test-client-id"),
      /claims failed validation/,
    );

    const badSignature = `${createToken(privateKey, validPayload).slice(0, -3)}abc`;
    await assert.rejects(
      verifyGoogleCredential(badSignature, "railconnect-test-client-id"),
      /signature is invalid/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
