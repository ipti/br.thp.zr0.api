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

  // Robust SQL splitter: process file line-by-line, ignore -- comments,
  // and collect statements that end with a semicolon. This avoids issues
  // with naive split(';') when comments or stray newlines exist.
  for (const file of files) {
    const sqlPath = join(__dirname, file);
    const sql = readFileSync(sqlPath, 'utf8');

    const lines = sql.split(/\r?\n/);
    let buffer = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // skip SQL single-line comments or empty lines
      if (line.startsWith('--') || line === '') continue;

      // append the original line (preserve spacing inside values)
      buffer += (buffer ? '\n' : '') + rawLine;

      // if the (trimmed) line ends with semicolon, we consider the statement complete
      if (line.endsWith(';')) {
        const stmt = buffer.replace(/;\s*$/, '').trim();
        if (stmt.length > 0) statements.push(stmt);
        buffer = '';
      }
    }

    // if anything left in buffer (file didn't end with semicolon), push it too
    if (buffer.trim().length > 0) statements.push(buffer.trim());
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

