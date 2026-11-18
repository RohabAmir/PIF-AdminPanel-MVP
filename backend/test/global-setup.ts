import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { loadTestEnv } from './setup-env';

/**
 * Prepares the dedicated e2e database once per run: applies migrations (non-destructive),
 * empties every table and re-runs the deterministic seed.
 * Refuses to run against any database whose name does not end in `_test`.
 */
export default async function globalSetup(): Promise<void> {
  loadTestEnv();
  const url = new URL(process.env.DATABASE_URL ?? '');
  const dbName = url.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to reset "${dbName}": e2e tests only run against a database ending in _test.`,
    );
  }
  const cwd = join(__dirname, '..');
  const env = { ...process.env };
  execSync('npx prisma migrate deploy', { cwd, env, stdio: 'pipe' });

  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(', ')} CASCADE`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
  execSync('npx prisma db seed', { cwd, env, stdio: 'pipe' });
}
