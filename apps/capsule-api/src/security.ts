const SCRYPT_KEYLEN = 64;
const ITERATIONS = 100_000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type RuntimeEnv = Record<string, string | undefined>;
const runtimeEnv: RuntimeEnv = ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

const toHex = (bytes: Uint8Array): string => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) throw new Error('INVALID_HEX');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  return bytes;
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<Uint8Array> => {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations: ITERATIONS }, baseKey, SCRYPT_KEYLEN * 8);
  return new Uint8Array(bits);
};

const parseKeyRing = (raw: string | undefined, fallbackKid: string, fallbackSecret: string): Array<{ kid: string; secret: string }> => {
  const trimmed = raw?.trim();
  if (!trimmed) return [{ kid: fallbackKid, secret: fallbackSecret }];
  return trimmed.split(',').map((entry, i) => {
    const [kid, secret] = entry.trim().split(':', 2);
    if (!kid || !secret) throw new Error('INVALID_ENV_KEYRING_FORMAT');
    return { kid: kid.trim() || `k${i + 1}`, secret: secret.trim() };
  });
};

const importHmacKey = async (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
};

export class SessionTokenManager {
  private readonly keys: Array<{ kid: string; secret: string }>;
  public constructor(secret: string) {
    this.keys = parseKeyRing(runtimeEnv.CAPSULE_SESSION_TOKEN_SECRETS, 'k1', secret);
  }
  public mint = async (): Promise<string> => {
    const opaque = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const active = this.keys[0] as { kid: string; secret: string };
    const key = await importHmacKey(active.secret);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(`${active.kid}.${opaque}`)));
    return `s1.${active.kid}.${opaque}.${toHex(sig)}`;
  };
  public verify = async (token: string): Promise<{ valid: boolean; needsRotation: boolean }> => {
    const [prefix, kid, opaque, sigHex] = token.split('.');
    if (prefix !== 's1' || !kid || !opaque || !sigHex) return { valid: false, needsRotation: false };
    const keyDef = this.keys.find((entry) => entry.kid === kid);
    if (!keyDef) return { valid: false, needsRotation: false };
    const key = await importHmacKey(keyDef.secret);
    const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(`${kid}.${opaque}`)));
    const provided = fromHex(sigHex);
    return { valid: timingSafeEqual(expected, provided), needsRotation: kid !== this.keys[0]?.kid };
  };
}

const deriveAesKey = async (secret: string): Promise<CryptoKey> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export class DataCipher {
  private readonly strategy: string;
  private readonly keys: Array<{ kid: string; secret: string }>;

  public constructor(defaultSecret: string) {
    this.strategy = (runtimeEnv.CAPSULE_DATA_ENCRYPTION_STRATEGY ?? 'plaintext').trim().toLowerCase();
    this.keys = parseKeyRing(runtimeEnv.CAPSULE_DATA_ENCRYPTION_KEYS, 'd1', defaultSecret);
  }

  public isEncryptionEnabled(): boolean { return this.strategy !== 'plaintext'; }
  public isEncryptedValue(payload: string): boolean { return payload.startsWith('enc1.'); }

  public encrypt = async (plain: string): Promise<string> => {
    if (!this.isEncryptionEnabled()) return plain;
    const active = this.keys[0] as { kid: string; secret: string };
    const key = await deriveAesKey(active.secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, textEncoder.encode(plain).buffer as ArrayBuffer));
    return `enc1.${active.kid}.${toHex(iv)}.${toHex(encrypted)}`;
  };

  public decrypt = async (raw: string): Promise<{ plain: string; needsMigration: boolean }> => {
    if (!this.isEncryptedValue(raw)) return { plain: raw, needsMigration: this.isEncryptionEnabled() };
    const [prefix, kid, ivHex, payloadHex] = raw.split('.');
    if (prefix !== 'enc1' || !kid || !ivHex || !payloadHex) throw new Error('INVALID_ENCRYPTED_PAYLOAD');
    const keyDef = this.keys.find((entry) => entry.kid === kid);
    if (!keyDef) throw new Error('UNKNOWN_ENCRYPTION_KEY_ID');
    const key = await deriveAesKey(keyDef.secret);
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(ivHex).buffer as ArrayBuffer }, key, fromHex(payloadHex).buffer as ArrayBuffer);
    return { plain: textDecoder.decode(plainBuffer), needsMigration: kid !== this.keys[0]?.kid };
  };
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt);
  return `${toHex(salt)}:${toHex(hash)}`;
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  const [saltHex, storedHashHex] = passwordHash.split(':');
  if (!saltHex || !storedHashHex) return false;
  const computed = await deriveKey(password, fromHex(saltHex));
  return toHex(computed) === storedHashHex;
};
