#!/usr/bin/env node
/**
 * Docker-free local infrastructure (fallback for machines without Docker).
 *  - PostgreSQL 16 via the `embedded-postgres` npm binaries (data in .local-infra/pgdata)
 *  - A Mailpit-compatible SMTP catcher (SMTP :1025, inbox UI + API :8025)
 * Same ports and credentials as docker-compose.yml, so the apps need no changes.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMailCatcher } from './mailcatcher.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, '.local-infra', 'pgdata');
mkdirSync(join(root, '.local-infra'), { recursive: true });
const fresh = !existsSync(join(dataDir, 'PG_VERSION'));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'pif',
  password: 'pif',
  port: Number(process.env.PGPORT ?? 5432),
  persistent: true,
  onLog: () => {},
  onError: (e) => console.error('[postgres]', String(e).trim()),
});

if (fresh) await pg.initialise();
await pg.start();
for (const db of ['pif_admin', 'pif_admin_test']) {
  try {
    await pg.createDatabase(db);
    console.log(`[postgres] created database ${db}`);
  } catch {
    /* already exists */
  }
}
console.log('[postgres] ready on localhost:5432 (user pif / pass pif)');

const mail = await startMailCatcher({ smtpPort: 1025, httpPort: 8025 });
console.log('[mail] SMTP on localhost:1025, inbox UI http://localhost:8025');

const shutdown = async () => {
  console.log('\nStopping local infra...');
  await mail.close();
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
