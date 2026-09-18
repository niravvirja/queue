/**
 * End-to-end encryption for Queue.
 *
 * - Every account has an ECDH P-256 identity key pair created in the browser.
 * - The private key is wrapped with an AES-GCM key derived from the account
 *   password (PBKDF2), so it can be restored on any device with the password.
 * - Every conversation has an AES-GCM 256 key, wrapped separately for each
 *   member using ECDH + HKDF against that member's public key.
 * - Message bodies and media are encrypted with the conversation key.
 *
 * The server only ever stores ciphertext and wrapped keys.
 */

const PBKDF2_ITERATIONS = 250_000;

export function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromB64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function passwordKey(password: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export type KeyRecord = {
  public_key: string;
  wrapped_private_key: string;
  salt: string;
  iv: string;
};

export async function createIdentity(password: string): Promise<KeyRecord> {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const publicRaw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const privatePkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const wrapper = await passwordKey(password, salt);
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    wrapper,
    privatePkcs8,
  );
  return {
    public_key: toB64(publicRaw),
    wrapped_private_key: toB64(wrapped),
    salt: toB64(salt),
    iv: toB64(iv),
  };
}

export async function unwrapIdentity(record: KeyRecord, password: string): Promise<ArrayBuffer> {
  const wrapper = await passwordKey(password, fromB64(record.salt));
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(record.iv) as BufferSource },
    wrapper,
    fromB64(record.wrapped_private_key) as BufferSource,
  );
}

export function importPrivateKey(pkcs8: ArrayBuffer) {
  return crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDH", namedCurve: "P-256" }, false, [
    "deriveBits",
  ]);
}

export function importPublicKey(publicKeyB64: string) {
  return crypto.subtle.importKey(
    "raw",
    fromB64(publicKeyB64) as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

async function sharedSecretKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const hkdfKey = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode("queue-conversation-key"),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function createConversationKeyBytes() {
  return randomBytes(32);
}

export type WrappedKey = {
  wrapped_key: string;
  key_iv: string;
  ephemeral_public_key: string;
};

/** Wrap a conversation key so that only the owner of `recipientPublicKey` can read it. */
export async function wrapConversationKey(
  keyBytes: Uint8Array,
  recipientPublicKeyB64: string,
): Promise<WrappedKey> {
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const recipient = await importPublicKey(recipientPublicKeyB64);
  const aesKey = await sharedSecretKey(ephemeral.privateKey, recipient);
  const iv = randomBytes(12);
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    aesKey,
    keyBytes as BufferSource,
  );
  const ephemeralPublic = await crypto.subtle.exportKey("raw", ephemeral.publicKey);
  return {
    wrapped_key: toB64(wrapped),
    key_iv: toB64(iv),
    ephemeral_public_key: toB64(ephemeralPublic),
  };
}

export async function unwrapConversationKey(
  wrapped: WrappedKey,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const ephemeralPublic = await importPublicKey(wrapped.ephemeral_public_key);
  const aesKey = await sharedSecretKey(privateKey, ephemeralPublic);
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(wrapped.key_iv) as BufferSource },
    aesKey,
    fromB64(wrapped.wrapped_key) as BufferSource,
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptText(key: CryptoKey, text: string) {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(text),
  );
  return { ciphertext: toB64(data), iv: toB64(iv) };
}

export async function decryptText(key: CryptoKey, ciphertext: string, iv: string) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(iv) as BufferSource },
    key,
    fromB64(ciphertext) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

export async function encryptBytes(key: CryptoKey, bytes: ArrayBuffer) {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    bytes,
  );
  return { data: new Uint8Array(data), iv: toB64(iv) };
}

export async function decryptBytes(key: CryptoKey, bytes: ArrayBuffer, iv: string) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) as BufferSource }, key, bytes);
}
