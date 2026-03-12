/**
 * Cifratura AES-256-GCM per file a riposo — GDPR compliance
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH  = 16;
const TAG_LENGTH = 16;
const KEY_ID_LEN = 32;  // bytes riservati per keyId nell'header del file

export interface EncryptedPayload {
  keyId: string; encrypted: Buffer; iv: Buffer; authTag: Buffer;
}

export class EncryptionService {
  private key:   Buffer;
  private keyId: string;

  constructor() {
  const hex = process.env.ENCRYPTION_KEY;
  if (process.env.NODE_ENV === 'production') {
    if (!hex || hex.length !== 64)
      throw new Error('ENCRYPTION_KEY: stringa hex 64 char richiesta in produzione');
    this.key = Buffer.from(hex, 'hex');
  } else {
    // Chiave fissa solo per sviluppo locale — mai usare in prod
    this.key = Buffer.from(
      hex || 'dev0000000000000000000000000000000000000000000000000000000000000000',
      'hex'
    );
    if (!hex) console.warn('[WARN] ENCRYPTION_KEY non impostata: uso chiave di sviluppo');
  }
  this.keyId = process.env.ENCRYPTION_KEY_ID || 'key-v1';
}

  encrypt(plain: Buffer): EncryptedPayload {
    const iv      = crypto.randomBytes(IV_LENGTH);
    const cipher  = crypto.createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
    const enc     = Buffer.concat([cipher.update(plain), cipher.final()]);
    return { keyId: this.keyId, encrypted: enc, iv, authTag: cipher.getAuthTag() };
  }

  decrypt(p: EncryptedPayload): Buffer {
    const d = crypto.createDecipheriv(ALGORITHM, this.key, p.iv, { authTagLength: TAG_LENGTH });
    d.setAuthTag(p.authTag);
    return Buffer.concat([d.update(p.encrypted), d.final()]);
  }

  /** Formato su disco: [keyId:32B][iv:16B][tag:16B][ciphertext] */
  serialize(p: EncryptedPayload): Buffer {
    const keyBuf = Buffer.alloc(KEY_ID_LEN);
    keyBuf.write(p.keyId.slice(0, KEY_ID_LEN), 'utf8');
    return Buffer.concat([keyBuf, p.iv, p.authTag, p.encrypted]);
  }

  deserialize(raw: Buffer): EncryptedPayload {
    const keyId     = raw.subarray(0, KEY_ID_LEN).toString('utf8').replace(/\0+$/, '');
    const iv        = raw.subarray(KEY_ID_LEN, KEY_ID_LEN + IV_LENGTH);
    const authTag   = raw.subarray(KEY_ID_LEN + IV_LENGTH, KEY_ID_LEN + IV_LENGTH + TAG_LENGTH);
    const encrypted = raw.subarray(KEY_ID_LEN + IV_LENGTH + TAG_LENGTH);
    return { keyId, iv, authTag, encrypted };
  }
}

export const encryptionService = new EncryptionService();