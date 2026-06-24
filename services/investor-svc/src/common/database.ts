import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { createLogger } from '@neolend/ts-common';

const log = createLogger('investor-svc:db');

export const PG_POOL = 'PG_POOL';

export function createPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgres://investor:svc_pw@localhost:5432/investor_db';
  return new Pool({ connectionString, max: 10 });
}

export async function runMigrations(pool: Pool): Promise<void> {
  const dir = join(__dirname, '..', '..', 'migrations');
  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      await pool.query(sql);
      log.info({ file }, 'migración aplicada');
    }
  } catch (err: any) {
    log.error({ err }, 'error al ejecutar migraciones');
  }
}
