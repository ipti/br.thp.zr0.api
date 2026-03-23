import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';
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

  function snippet(s: string, n = 200) {
    if (!s) return '';
    if (s.length <= n) return s;
    return s.slice(0, n) + ' ... ' + s.slice(-n);
  }

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      console.log(`Executing SQL statement ${i + 1}/${statements.length} (len=${statement.length})`);
      console.log('Statement head/tail:', snippet(statement, 200));
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      console.error(`Erro ao executar statement index=${i} (len=${statement.length}):`);
      console.error('Full statement:\n', statement);

      try {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const outPath = join(__dirname, `failed-seed-statement-${i + 1}-${ts}.sql`);
        writeFileSync(outPath, statement, 'utf8');
        console.error(`Wrote failing statement to: ${outPath}`);
      } catch (writeErr) {
        console.error('Failed to write failing statement to disk:', writeErr);
      }

      // Re-throw the original error so the process exits with failure as before
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

