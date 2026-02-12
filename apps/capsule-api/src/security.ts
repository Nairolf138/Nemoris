const SCRYPT_KEYLEN = 64;
const ITERATIONS = 100_000;

const textEncoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error('INVALID_HEX');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<Uint8Array> => {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
    },
    baseKey,
    SCRYPT_KEYLEN * 8,
  );

  return new Uint8Array(bits);
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt);
  return `${toHex(salt)}:${toHex(hash)}`;
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  const [saltHex, storedHashHex] = passwordHash.split(':');
  if (!saltHex || !storedHashHex) {
    return false;
  }

  const salt = fromHex(saltHex);
  const computed = await deriveKey(password, salt);
  return toHex(computed) === storedHashHex;
};

export const generateToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
};
