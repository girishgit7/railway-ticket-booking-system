const BASE = "https://api.railradar.in/v1";
const cache = new Map();
const CACHE_TTL_MS = 60_000;

export async function railRadarGet(endpoint, params = {}) {
  const key = process.env.RAILRADAR_API_KEY;
  if (!key) {
    const error = new Error("Live railway data is not configured. Add RAILRADAR_API_KEY to server/.env.");
    error.status = 503; throw error;
  }
  const url = new URL(`${BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return { ...cached.value, cached: true };
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const error = new Error(body?.error?.message || `RailRadar request failed (${response.status}).`);
    error.status = response.status === 429 ? 429 : response.status >= 500 ? 503 : response.status;
    error.providerCode = body?.error?.code;
    throw error;
  }
  const value = { data: body.data, meta: body.meta, rateLimit: { remainingMonth: response.headers.get("X-RateLimit-Remaining-Month"), remainingMinute: response.headers.get("X-RateLimit-Remaining-Min") }, cached: false };
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}
