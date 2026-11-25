import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Memory-hard password hashing using Node's built-in scrypt (no native deps). */
@Injectable()
export class PasswordService {
  private readonly cost: number;

  constructor(config: ConfigService) {
    const raw = Number(config.get('scryptCost') ?? 14);
    if (!Number.isInteger(raw) || raw < 12 || raw > 16) throw new Error('Invalid scrypt cost');
    this.cost = raw;
  }

  async hash(password: string): Promise<{ hash: string; salt: string }> {
    if (password.length < 12) throw new Error('PASSWORD_TOO_SHORT');
    const salt = randomBytes(16);
    const derived = await this.derive(password, salt);
    return { hash: derived.toString('base64'), salt: salt.toString('base64') };
  }

  async verify(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
    const salt = Buffer.from(storedSalt, 'base64');
    const expected = Buffer.from(storedHash, 'base64');
    const actual = await this.derive(password, salt);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private derive(password: string, salt: Buffer): Promise<Buffer> {
    return scrypt(password, salt, 64, { N: 2 ** this.cost, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  }
}
