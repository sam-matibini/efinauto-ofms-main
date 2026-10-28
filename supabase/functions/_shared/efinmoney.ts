// Shared eFinMoney partner-API helpers (used by `efinmoney`,
// `create-payment-link` and `efinmoney-webhook`).
//
// Secrets: EFINMONEY_API_KEY (efk_live_...), EFINMONEY_TOKEN_ENC_KEY
// (base64 AES-256 key that encrypts stored customer link tokens).

export const EFIN_BASE = "https://dkdnwumllibwdlqbjkwy.supabase.co/functions/v1/partner-api";

export function getApiKey() {
  const key = Deno.env.get("EFINMONEY_API_KEY");
  if (!key) throw new Error("EFINMONEY_API_KEY not configured");
  return key;
}

function getEncKey() {
  const key = Deno.env.get("EFINMONEY_TOKEN_ENC_KEY");
  if (!key) throw new Error("EFINMONEY_TOKEN_ENC_KEY not configured");
  return key;
}

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function importKey() {
  const raw = b64ToBytes(getEncKey());
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return `v1.${bytesToB64(iv)}.${bytesToB64(new Uint8Array(ct))}`;
}

export async function decryptToken(cipher: string): Promise<string> {
  const parts = cipher.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("invalid_token_format");
  const key = await importKey();
  const iv = b64ToBytes(parts[1]);
  const ct = b64ToBytes(parts[2]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export async function efinFetch(path: string, init: RequestInit = {}, linkToken?: string) {
  const headers: Record<string, string> = {
    "X-API-Key": getApiKey(),
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> || {}),
  };
  if (linkToken) headers["Authorization"] = `Bearer ${linkToken}`;
  const res = await fetch(`${EFIN_BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

/** Error codes meaning the stored link token is dead and the company must reconnect. */
export const RECONNECT_CODES = new Set(["link_revoked", "invalid_link_token", "missing_link_token"]);

/**
 * Verify an `X-Efin-Signature: t=<unix>,v1=<hex>` header: HMAC-SHA256 of
 * `"<t>.<raw body>"` with the webhook signing secret, rejecting events whose
 * timestamp is more than `toleranceSec` away from now.
 */
export async function verifyEfinSignature(
  rawBody: string,
  header: string,
  secret: string,
  toleranceSec = 300,
): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const idx = kv.indexOf("=");
    if (idx <= 0) continue;
    parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  const t = Number(parts.t);
  const sig = parts.v1 ?? "";
  if (!t || !sig) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${parts.t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}
