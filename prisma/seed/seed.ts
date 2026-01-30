import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();


async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  const files = ['script-state-city.sql', 'script-profile.sql'];



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

  const userAdmin = await prisma.users.findUnique({
    where: { email: 'admin@admin.com' }
  })

  if (!userAdmin) {

    const hashedPassword = await hashPassword(process.env.PASSWORD_ADMIN ?? '12345678');
    await prisma.users.create({
      data: {
        email: 'admin@admin.com',
        name: 'Admin',
        role: 'ADMIN',
        password: hashedPassword,
        verify_email: true
      }
    })
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

