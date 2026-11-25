import { PasswordService } from './password.service';

const config = { get: () => 12 } as never;

describe('PasswordService', () => {
  const service = new PasswordService(config);

  it('hashes and verifies a strong password', async () => {
    const { hash, salt } = await service.hash('correct-horse-battery-2026');
    expect(await service.verify('correct-horse-battery-2026', hash, salt)).toBe(true);
    expect(await service.verify('wrong-password-2026', hash, salt)).toBe(false);
  });

  it('rejects short passwords', async () => {
    await expect(service.hash('too-short')).rejects.toThrow('PASSWORD_TOO_SHORT');
  });
});
