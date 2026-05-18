import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scriptsDir = join(__dirname, 'scripts');

function readLineSqlStatements(fileName: string): string[] {
  return readFileSync(join(scriptsDir, fileName), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function readSqlStatements(fileName: string): string[] {
  return readFileSync(join(scriptsDir, fileName), 'utf8')
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function finalizeStatement(statement: string): string {
  const normalized = statement.replace(/;\s*$/, '');

  if (/\bon\s+conflict\b/i.test(normalized)) {
    return `${normalized};`;
  }

  if (/^insert\s+into\s+public\.country\b/i.test(normalized)) {
    return `${normalized} ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;`;
  }

  if (/^insert\s+into\s+public\.school\b/i.test(normalized)) {
    return `${normalized} ON CONFLICT (id) DO UPDATE SET external_id = EXCLUDED.external_id, name = EXCLUDED.name, country_id = EXCLUDED.country_id, country_code = EXCLUDED.country_code, address = EXCLUDED.address, giga_id_school = EXCLUDED.giga_id_school;`;
  }

  return `${normalized};`;
}

async function runStatements(statements: string[]): Promise<void> {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(finalizeStatement(statement));
  }
}

async function main(): Promise<void> {
  await runStatements(readLineSqlStatements('country-insert-script.sql'));
  await runStatements(readSqlStatements('local-dev-seed.sql'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
