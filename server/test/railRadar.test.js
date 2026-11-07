import test from "node:test";
import assert from "node:assert/strict";
import { railRadarGet } from "../src/services/railRadar.js";

test("RailRadar client requires a server-side API key", async () => {
  const previous = process.env.RAILRADAR_API_KEY;
  delete process.env.RAILRADAR_API_KEY;
  await assert.rejects(() => railRadarGet("/lookup/search/stations", { q: "SBC" }), { status: 503 });
  if (previous !== undefined) process.env.RAILRADAR_API_KEY = previous;
});

test("RailRadar client caches successful responses", async () => {
  const previousKey = process.env.RAILRADAR_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.RAILRADAR_API_KEY = "test-key";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ success: true, data: [{ code: "SBC", name: "KSR Bengaluru" }], meta: { source: "test" } }), {
      status: 200,
      headers: { "content-type": "application/json", "X-RateLimit-Remaining-Month": "99" },
    });
  };
  try {
    const q = `SBC-${Date.now()}`;
    const first = await railRadarGet("/lookup/search/stations", { q });
    const second = await railRadarGet("/lookup/search/stations", { q });
    assert.equal(first.data[0].code, "SBC");
    assert.equal(calls, 1);
    assert.equal(second.cached, true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RAILRADAR_API_KEY; else process.env.RAILRADAR_API_KEY = previousKey;
  }
});
