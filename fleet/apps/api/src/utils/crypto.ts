import crypto from 'node:crypto';

// AES-256-GCM field-level encryption for sensitive PII (Section 12.2)
// Compliant with DPDP Act 2023 & Engineering Specification v1.0

const ALGORITHM = 'aes-256-gcm';
const KEY_ID = 'k1';
// 32-byte master key (in production sourced from KMS / environment secret)
const MASTER_KEY = crypto.scryptSync(
  process.env.PII_ENCRYPTION_KEY || 'fleet-production-master-secret-2026',
  'salt_deccan_transit_2026',
  32
);

export interface EncryptedField {
  key_id: string;
  iv: string;
  auth_tag: string;
  ciphertext: string;
}

export function encryptSensitiveField(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: key_id:iv:auth_tag:ciphertext
  return `${KEY_ID}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSensitiveField(packedString: string): string {
  const parts = packedString.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted field format');
  }

  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
