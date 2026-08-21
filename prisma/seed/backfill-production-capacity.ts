// Backfill de production_capacity a partir de transformation_workshop_product.
// Cria uma linha inativa (monthly_capacity=0, active=false) para cada par
// (transformation_workshop_fk, product_fk) distinto já existente, permitindo
// que o admin declare a capacidade real depois (TASK-03/production-capacity).
//
// transformation_workshop_product não tem @@unique([transformation_workshop_fk, product_fk]),
// então pares duplicados são agregados (a primeira linha do grupo vence) e
// logados em um arquivo de auditoria para revisão manual.
//
// Uso: npx ts-node --transpile-only prisma/seed/backfill-production-capacity.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.transformation_workshop_product.findMany({
    select: { id: true, transformation_workshop_fk: true, product_fk: true },
  });

  const groups = new Map<
    string,
    { transformation_workshop_fk: number; product_fk: number; ids: number[] }
  >();

  let skippedNullFk = 0;

  for (const row of rows) {
    if (row.transformation_workshop_fk == null || row.product_fk == null) {
      skippedNullFk++;
      continue;
    }
    const key = `${row.transformation_workshop_fk}:${row.product_fk}`;
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(row.id);
    } else {
      groups.set(key, {
        transformation_workshop_fk: row.transformation_workshop_fk,
        product_fk: row.product_fk,
        ids: [row.id],
      });
    }
  }

  const duplicates = [...groups.values()].filter((g) => g.ids.length > 1);

  let created = 0;
  let skippedExisting = 0;

  for (const group of groups.values()) {
    const existingCapacity = await prisma.production_capacity.findUnique({
      where: {
        transformation_workshop_fk_product_fk: {
          transformation_workshop_fk: group.transformation_workshop_fk,
          product_fk: group.product_fk,
        },
      },
    });

    if (existingCapacity) {
      skippedExisting++;
      continue;
    }

    await prisma.production_capacity.create({
      data: {
        transformation_workshop_fk: group.transformation_workshop_fk,
        product_fk: group.product_fk,
        monthly_capacity: 0,
        active: false,
      },
    });
    created++;
  }

  if (duplicates.length > 0) {
    const logPath = path.join(
      __dirname,
      `backfill-production-capacity-duplicates-${Date.now()}.json`,
    );
    fs.writeFileSync(logPath, JSON.stringify(duplicates, null, 2), 'utf8');
    console.log(
      `Atenção: ${duplicates.length} par(es) duplicado(s) em transformation_workshop_product foram agregados (primeira linha do grupo mantida). Log: ${logPath}`,
    );
  }

  if (skippedNullFk > 0) {
    console.log(
      `Atenção: ${skippedNullFk} linha(s) de transformation_workshop_product com transformation_workshop_fk/product_fk nulo foram ignoradas.`,
    );
  }

  console.log(
    `Backfill concluído: ${groups.size} par(es) distinto(s) encontrados, ${created} linha(s) criada(s) em production_capacity, ${skippedExisting} já existiam (idempotência).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
