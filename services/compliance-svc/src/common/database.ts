import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { createLogger } from '@neolend/ts-common';

const log = createLogger('compliance-svc:db');

export const PG_POOL = 'PG_POOL';

export function createPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgres://compliance:svc_pw@localhost:5432/compliance_db';
  return new Pool({ connectionString, max: 10 });
}

/**
 * Aplica todas las migraciones .sql (idempotentes) en orden alfabético.
 * Carpeta migrations/ resuelta relativa al root del servicio (sirve para
 * src/ con ts-node y dist/ compilado).
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const dir = join(__dirname, '..', '..', 'migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    await pool.query(sql);
    log.info({ file }, 'migración aplicada');
  }
}
