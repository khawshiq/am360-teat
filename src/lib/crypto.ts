import crypto from "crypto";

// AES-256-GCM at-rest encryption for tenant secrets (currently: each academy's WhatsApp
// access token). Configure ENCRYPTION_KEY in Vercel env — 32 bytes, hex-encoded
// (`openssl rand -hex 32`). No insecure fallback: an unset key fails loudly rather than
// silently storing plaintext.
const ALGORITHM = "aes-256-gcm";

// Thrown when the SERVER is misconfigured (key missing / wrong shape). Routes map it
// through `configError()` (src/lib/api.ts) to a 500 whose body names the env var to
// fix — an unset key used to surface as a bare "Request failed (500)" on the Connect
// form, which is unactionable.
export class EncryptionConfigError extends Error {}

// Thrown when the key is valid but the stored ciphertext cannot be opened with it —
// in practice, ENCRYPTION_KEY was rotated after the credentials were saved. The fix
// is a user action (reconnect), not an env change, so it maps to a 400.
export class DecryptFailedError extends Error {}

const ROTATED =
  "Your saved WhatsApp credentials could not be read — the server's encryption key changed after they were saved. Use Update credentials to enter the access token again.";

function getKey(): Buffer {
  // Values pasted into the Vercel dashboard routinely arrive wrapped in the quotes
  // copied from .env.example, or with a trailing newline — both make an otherwise
  // correct key fail the length check below, so strip them before decoding.
  const key = (process.env.ENCRYPTION_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!key)
    throw new EncryptionConfigError(
      "Server encryption is not configured: ENCRYPTION_KEY is missing. Add it in Vercel → Settings → Environment Variables (64 hex characters, from `openssl rand -hex 32`) and redeploy.",
    );
  if (!/^[0-9a-fA-F]{64}$/.test(key))
    throw new EncryptionConfigError(
      `Server encryption is misconfigured: ENCRYPTION_KEY must be exactly 64 hex characters (got ${key.length}). Generate one with \`openssl rand -hex 32\`, set it in Vercel, and redeploy.`,
    );
  return Buffer.from(key, "hex");
}

// Stored as "iv:authTag:ciphertext", all hex, one random IV per call.
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const key = getKey(); // outside the try — a config problem must not read as a rotation
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new DecryptFailedError(ROTATED);
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    // GCM auth-tag mismatch — right format, wrong key.
    throw new DecryptFailedError(ROTATED);
  }
}
