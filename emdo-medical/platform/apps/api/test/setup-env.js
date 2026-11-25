const path = require('node:path');
const dotenv = require('dotenv');

// __dirname is platform/apps/api/test; the shared environment file is three
// levels up, at platform/.env. Loading the correct file makes the
// TEST_DATABASE_URL override below effective and keeps e2e truncation away
// from the development database.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.NODE_ENV = 'test';
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
