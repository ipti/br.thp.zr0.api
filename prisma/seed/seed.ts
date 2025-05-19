import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  const sqlPath = join(__dirname, 'script-state-city.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  // Separar comandos por ponto-e-vírgula
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

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
