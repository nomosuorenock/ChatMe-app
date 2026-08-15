/**
 * Backup Cryptography Module
 * Implements AES-GCM 256-bit authenticated encryption with PBKDF2-SHA-256 key derivation
 * and SHA-256 integrity checksum verification.
 * 
 * Never logs plaintext passwords, backup keys, or private payload contents.
 */

export interface EncryptedBackupEnvelope {
  version: string;
  algorithm: "AES-GCM-256";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string; // Hex encoded salt
  iv: string; // Hex encoded initialization vector
  checksum: string; // SHA-256 hex checksum of original plaintext
  ciphertext: string; // Base64 encoded encrypted payload
  timestamp: string;
  userId: string;
}

const KDF_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;

// Convert Uint8Array to Hex string
function bufToHex(buffer: ArrayBuffer | Uint8Array): string {
  const byteArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(byteArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to Base64 string
function bufToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const byteArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    binary += String.fromCharCode(byteArray[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to Uint8Array
function base64ToBuf(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Calculate SHA-256 checksum of UTF-8 string
 */
export async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuf = encoder.encode(data);
  const hashBuf = await crypto.subtle.digest('SHA-256', dataBuf);
  return bufToHex(hashBuf);
}

/**
 * Derive an AES-GCM CryptoKey using PBKDF2 from a secret passphrase and salt
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretKeyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    secretKeyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a JSON serializable payload using AES-GCM 256
 */
export async function encryptBackupPayload<T = any>(
  payload: T,
  secretKeySource: string,
  userId: string
): Promise<EncryptedBackupEnvelope> {
  const plaintext = JSON.stringify(payload);
  const checksum = await calculateChecksum(plaintext);
  
  // Generate random salt (16 bytes) and IV (12 bytes for AES-GCM)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive AES key
  const cryptoKey = await deriveKey(secretKeySource, salt);

  // Encrypt payload
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);
  const encryptedBuf = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    encodedPlaintext
  );

  return {
    version: '1.0',
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: KDF_ITERATIONS,
    salt: bufToHex(salt),
    iv: bufToHex(iv),
    checksum: checksum,
    ciphertext: bufToBase64(encryptedBuf),
    timestamp: new Date().toISOString(),
    userId: userId,
  };
}

/**
 * Decrypt an EncryptedBackupEnvelope back into its parsed JSON object
 */
export async function decryptBackupPayload<T = any>(
  envelope: EncryptedBackupEnvelope,
  secretKeySource: string
): Promise<{ data: T; checksumVerified: boolean }> {
  if (!envelope || envelope.algorithm !== 'AES-GCM-256') {
    throw new Error('Unsupported or corrupted backup format.');
  }

  const salt = hexToBuf(envelope.salt);
  const iv = hexToBuf(envelope.iv);
  const ciphertextBytes = base64ToBuf(envelope.ciphertext);

  // Derive AES key with same parameters
  const cryptoKey = await deriveKey(secretKeySource, salt);

  try {
    const decryptedBuf = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedBuf);

    // Verify integrity checksum
    const calculated = await calculateChecksum(plaintext);
    const checksumVerified = calculated.toLowerCase() === envelope.checksum.toLowerCase();

    if (!checksumVerified) {
      throw new Error('Backup integrity check failed: checksum mismatch (data may be corrupted).');
    }

    const data = JSON.parse(plaintext) as T;
    return { data, checksumVerified };
  } catch (error: any) {
    if (error.name === 'OperationError' || error.message?.includes('OperationError')) {
      throw new Error('Decryption failed. Incorrect backup passphrase or corrupted file.');
    }
    throw error;
  }
}
