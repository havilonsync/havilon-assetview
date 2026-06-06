import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(input: string) {
  const normalized = input.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function formatOtpAuthLabel(issuer: string, accountName: string) {
  return `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
}

export function generateTotpSecret(size = 20) {
  return encodeBase32(crypto.randomBytes(size));
}

export function buildOtpAuthUrl(input: { issuer: string; accountName: string; secret: string }) {
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${formatOtpAuthLabel(input.issuer, input.accountName)}?${params.toString()}`;
}

export function generateTotpToken(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 30000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = ((hmac[offset] & 127) << 24)
    | ((hmac[offset + 1] & 255) << 16)
    | ((hmac[offset + 2] & 255) << 8)
    | (hmac[offset + 3] & 255);

  return String(binary % 1000000).padStart(6, "0");
}

export function verifyTotpToken(secret: string, token: string, window = 1) {
  const normalizedToken = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedToken)) return false;

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateTotpToken(secret, Date.now() + offset * 30000);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalizedToken))) {
      return true;
    }
  }

  return false;
}