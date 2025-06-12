import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  const files = ['script-state-city.sql'];

  const statements: string[] = [];

  for (const file of files) {
    const sqlPath = join(__dirname, file);
    const sql = readFileSync(sqlPath, 'utf8');

    statements.push(
      ...sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );
  }

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      console.error(`Erro ao executar: ${statement}`);
      throw error;
    }
  }

  console.log('Seed SQL executado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
