/**
 * Smoke: database connectivity & schema presence (OPT-IN, READ-ONLY).
 *
 * Skipped unless run via `npm run smoke:db` or with SMOKE_DB=1. When enabled,
 * DATABASE_URL must be set (from the environment, .env.local, or .env).
 *
 * Everything runs inside a READ ONLY transaction: Postgres itself rejects any
 * write, so this can never mutate player data or schema. It only:
 *   1. connects and runs SELECT 1
 *   2. checks every model/column in prisma/schema.prisma exists in the live
 *      database (the Mission 1 drift finding means migrations can't be trusted
 *      to describe the DB — this checks the thing the app actually queries)
 *   3. runs one trivial read through the generated Prisma client
 */
import { config } from 'dotenv';
import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';

const enabled = process.env.SMOKE_DB === '1' || process.env.npm_lifecycle_event === 'smoke:db';

describe.skipIf(!enabled)('smoke: database (read-only)', () => {
  config({ path: ['.env.local', '.env'], quiet: true });

  const prisma = new PrismaClient({ log: ['error'] });
  afterAll(() => prisma.$disconnect());

  function readOnly<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return fn(tx);
    });
  }

  it('DATABASE_URL is configured', () => {
    expect(process.env.DATABASE_URL, 'set DATABASE_URL (env, .env.local or .env)').toBeTruthy();
  });

  it('connects and answers SELECT 1', async () => {
    const rows = await readOnly((tx) => tx.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`);
    expect(rows[0].ok).toBe(1);
  });

  it('every table and column in schema.prisma exists in the database', async () => {
    const cols = await readOnly((tx) =>
      tx.$queryRaw<{ table_name: string; column_name: string }[]>`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()`,
    );
    const live = new Map<string, Set<string>>();
    for (const c of cols) {
      if (!live.has(c.table_name)) live.set(c.table_name, new Set());
      live.get(c.table_name)!.add(c.column_name);
    }

    const missing: string[] = [];
    for (const model of Prisma.dmmf.datamodel.models) {
      const table = model.dbName ?? model.name;
      const liveCols = live.get(table);
      if (!liveCols) {
        missing.push(`table ${table} (model ${model.name})`);
        continue;
      }
      for (const field of model.fields) {
        if (field.kind !== 'scalar' && field.kind !== 'enum') continue; // relations have no column
        const column = field.dbName ?? field.name;
        if (!liveCols.has(column)) missing.push(`column ${table}.${column}`);
      }
    }

    expect(missing, `schema.prisma expects objects the database doesn't have`).toEqual([]);
  });

  it('can read through the Prisma client', async () => {
    const count = await readOnly((tx) => tx.user.count());
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
