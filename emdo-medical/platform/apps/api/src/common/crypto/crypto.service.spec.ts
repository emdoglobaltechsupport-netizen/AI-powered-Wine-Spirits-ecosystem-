import { randomBytes } from 'node:crypto';
import { CryptoService } from './crypto.service';

const config = { getOrThrow: () => randomBytes(32).toString('base64') } as never;

describe('CryptoService', () => {
  const service = new CryptoService(config);
  const tenantId = '11111111-1111-4111-8111-111111111111';

  it('round-trips encrypted content for a tenant', () => {
    const plaintext = JSON.stringify({ resourceType: 'Observation', note: 'sensitive' });
    const encrypted = service.encrypt(plaintext, tenantId);
    expect(encrypted.ciphertext.toString()).not.toContain('sensitive');
    expect(service.decrypt(encrypted, tenantId)).toBe(plaintext);
  });

  it('cannot decrypt another tenant\'s content', () => {
    const encrypted = service.encrypt('secret', tenantId);
    expect(() => service.decrypt(encrypted, '22222222-2222-4222-8222-222222222222')).toThrow();
  });

  it('detects tampering', () => {
    const encrypted = service.encrypt('secret', tenantId);
    encrypted.ciphertext[0] = (encrypted.ciphertext[0] ?? 0) ^ 1;
    expect(() => service.decrypt(encrypted, tenantId)).toThrow();
  });

  it('hashes identifiers deterministically without revealing them', () => {
    const first = service.hashIdentifier('Patient@Example.Invalid');
    const second = service.hashIdentifier(' patient@example.invalid ');
    expect(first).toBe(second);
    expect(first).not.toContain('patient');
    expect(first).toHaveLength(64);
  });
});
