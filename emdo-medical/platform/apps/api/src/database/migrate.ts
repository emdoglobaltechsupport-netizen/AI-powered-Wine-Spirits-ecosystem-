import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { join } from 'node:path';
import { AppModule } from '../app.module';
import { CountryProfileService } from '../config/country-profile.service';
import { DatabaseService } from './database.service';

async function main(): Promise<void> {
  const logger = new Logger('Migrate');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const db = app.get(DatabaseService);
    const applied = await db.runMigrations(join(__dirname, 'migrations'));
    logger.log(applied.length ? `Applied: ${applied.join(', ')}` : 'No pending migrations');
    await app.get(CountryProfileService).refresh();
  } finally {
    await app.close();
  }
}

void main();
