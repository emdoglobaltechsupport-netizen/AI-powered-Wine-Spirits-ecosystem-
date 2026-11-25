import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CountryProfileStatus } from '@emdo/shared';
import { DatabaseService } from '../database/database.service';

export interface CountryProfile {
  code: string;
  displayName: string;
  status: CountryProfileStatus;
  config: Record<string, unknown>;
}

/**
 * Country configuration is data, not code. Missing or unsuitable profiles deny
 * access (fail-closed). No country ships activated in this repository.
 */
@Injectable()
export class CountryProfileService implements OnModuleInit {
  private readonly logger = new Logger(CountryProfileService.name);
  private readonly cache = new Map<string, CountryProfile>();

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.refresh();
    } catch {
      // The migration CLI intentionally boots before tables exist. Access is
      // fail-closed in CountryGuard until profiles are loaded.
      this.logger.warn('Country profiles unavailable at startup; run migrations');
    }
  }

  async refresh(): Promise<void> {
    const result = await this.db.query<CountryProfile>(
      'SELECT code, display_name AS "displayName", status, config FROM country_profiles',
    );
    this.cache.clear();
    for (const row of result.rows) this.cache.set(row.code, row);
    this.logger.log(`Loaded ${this.cache.size} country profile(s); none activated by this repository`);
  }

  get(code: string): CountryProfile | undefined {
    return this.cache.get(code.toUpperCase());
  }

  assertUsable(code: string): CountryProfile {
    const profile = this.get(code);
    if (!profile) {
      throw new Error(`COUNTRY_PROFILE_MISSING: ${code}`);
    }
    const mode = this.config.get<'sandbox' | 'approved'>('countryProfileMode');
    const allowed: CountryProfileStatus[] = mode === 'approved' ? ['approved'] : ['sandbox', 'ready_for_review', 'approved'];
    if (!allowed.includes(profile.status)) {
      throw new Error(`COUNTRY_PROFILE_NOT_USABLE: ${code} (${profile.status})`);
    }
    return profile;
  }

  async upsert(code: string, displayName: string, status: CountryProfileStatus, configJson: Record<string, unknown>): Promise<void> {
    await this.db.query(
      `INSERT INTO country_profiles (code, display_name, status, config)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET display_name = EXCLUDED.display_name,
         status = EXCLUDED.status, config = EXCLUDED.config, updated_at = now()`,
      [code.toUpperCase(), displayName, status, JSON.stringify(configJson)],
    );
    await this.refresh();
  }
}
