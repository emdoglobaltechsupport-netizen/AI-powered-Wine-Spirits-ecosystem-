import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, createHash, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

export interface EncryptedPayload {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/** AES-256-GCM envelope encryption with a tenant-derived data key. */
@Injectable()
export class CryptoService {
  private readonly masterKey: Buffer;

  constructor(config: ConfigService) {
    const encoded = config.getOrThrow<string>('dataEncryptionKey');
    this.masterKey = Buffer.from(encoded, 'base64');
    if (this.masterKey.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes');
  }

  private tenantKey(tenantId: string): Buffer {
    const derived = hkdfSync(
      'sha256',
      this.masterKey,
      Buffer.from(tenantId, 'utf8'),
      Buffer.from('emdo-record-v1', 'utf8'),
      32,
    );
    return Buffer.from(derived);
  }

  encrypt(plaintext: string, tenantId: string): EncryptedPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.tenantKey(tenantId), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return { ciphertext, iv, authTag: cipher.getAuthTag() };
  }

  decrypt(payload: EncryptedPayload, tenantId: string): string {
    const decipher = createDecipheriv('aes-256-gcm', this.tenantKey(tenantId), payload.iv);
    decipher.setAuthTag(payload.authTag);
    return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]).toString('utf8');
  }

  /** Deterministic lookup hash; never reversible and never contains PHI. */
  hashIdentifier(value: string): string {
    return createHmac('sha256', this.masterKey).update(value.trim().toLowerCase()).digest('hex');
  }

  integrityHash(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  opaqueToken(bytes = 48): string {
    return randomBytes(bytes).toString('base64url');
  }

  constantTimeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
