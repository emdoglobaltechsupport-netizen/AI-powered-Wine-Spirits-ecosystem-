import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { CountryProfileService } from './config/country-profile.service';
import { IdentityService } from './identity/identity.service';

/**
 * Creates only a SANDBOX country profile and, if explicitly configured, a
 * platform administrator. It seeds no patient, clinical or catalogue data.
 */
async function main(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const profiles = app.get(CountryProfileService);
    await profiles.upsert('SANDBOX', 'Sandbox (non-clinical test configuration)', 'sandbox', {
      clinicalUse: false,
      dataResidency: 'local-test-only',
      paymentMethods: [],
      // Manual review is for non-clinical testing only. It is not an
      // authoritative registry and never satisfies production verification.
      verificationSources: [{ kind: 'manual', enabled: true, authoritative: false, tested: false }],
    });
    logger.log('SANDBOX profile ready (not an activated country)');

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (email && password && !/REPLACE_WITH/.test(password)) {
      const identity = app.get(IdentityService);
      await identity.createStaff({
        identifier: email, password, countryCode: 'SANDBOX', roles: ['platform_admin'],
      });
      logger.log('Platform administrator account created from environment');
    } else {
      logger.warn('No bootstrap administrator created; set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD');
    }
  } finally {
    await app.close();
  }
}

void main();
