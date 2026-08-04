// Backfill de inventory a partir de transformation_workshop_product.
// Migra o estoque historico (quantity) para o ledger inventory + inventory_entry,
// que passa a ser a fonte de verdade do Pedido de Pronta Entrega (TASK-02).
//
// transformation_workshop_product nao tem @@unique([transformation_workshop_fk, product_fk]),
// entao pares duplicados sao agregados (soma das quantidades) e logados em um
// arquivo de auditoria para revisao manual. Se ja existir uma linha em inventory
// para o par, o script NAO sobrescreve - loga como conflito para revisao manual.
//
// Uso: npx ts-node --transpile-only prisma/scripts/backfill-inventory-from-tw-product.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.transformation_workshop_product.findMany({
    select: {
      id: true,
      transformation_workshop_fk: true,
      product_fk: true,
      quantity: true,
    },
  });

  const groups = new Map<
    string,
    {
      transformation_workshop_fk: number;
      product_fk: number;
      ids: number[];
      totalQuantity: number;
    }
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
      existing.totalQuantity += row.quantity;
    } else {
      groups.set(key, {
        transformation_workshop_fk: row.transformation_workshop_fk,
        product_fk: row.product_fk,
        ids: [row.id],
        totalQuantity: row.quantity,
      });
    }
  }

  const duplicates = [...groups.values()].filter((g) => g.ids.length > 1);
  const conflicts: Array<{
    transformation_workshop_fk: number;
    product_fk: number;
    existingQuantity: number;
    backfillQuantity: number;
  }> = [];

  let created = 0;
  let skippedZero = 0;

  for (const group of groups.values()) {
    if (group.totalQuantity <= 0) {
      skippedZero++;
      continue;
    }

    const existingInventory = await prisma.inventory.findUnique({
      where: {
        transformation_workshop_fk_product_fk: {
          transformation_workshop_fk: group.transformation_workshop_fk,
          product_fk: group.product_fk,
        },
      },
    });

    if (existingInventory) {
      conflicts.push({
        transformation_workshop_fk: group.transformation_workshop_fk,
        product_fk: group.product_fk,
        existingQuantity: existingInventory.quantity,
        backfillQuantity: group.totalQuantity,
      });
      continue;
    }

    await prisma.$transaction([
      prisma.inventory.create({
        data: {
          transformation_workshop_fk: group.transformation_workshop_fk,
          product_fk: group.product_fk,
          quantity: group.totalQuantity,
        },
      }),
      prisma.inventory_entry.create({
        data: {
          transformation_workshop_fk: group.transformation_workshop_fk,
          product_fk: group.product_fk,
          quantity: group.totalQuantity,
        },
      }),
    ]);
    created++;
  }

  if (duplicates.length > 0) {
    const logPath = path.join(
      __dirname,
      `backfill-inventory-duplicates-${Date.now()}.json`,
    );
    fs.writeFileSync(logPath, JSON.stringify(duplicates, null, 2), 'utf8');
    console.log(
      `Atenção: ${duplicates.length} par(es) duplicado(s) em transformation_workshop_product foram agregados (quantidades somadas). Log: ${logPath}`,
    );
  }

  if (conflicts.length > 0) {
    const logPath = path.join(
      __dirname,
      `backfill-inventory-conflicts-${Date.now()}.json`,
    );
    fs.writeFileSync(logPath, JSON.stringify(conflicts, null, 2), 'utf8');
    console.log(
      `Atenção: ${conflicts.length} par(es) já tinham inventory existente e NÃO foram sobrescritos. Log: ${logPath}`,
    );
  }

  if (skippedNullFk > 0) {
    console.log(
      `Atenção: ${skippedNullFk} linha(s) de transformation_workshop_product com transformation_workshop_fk/product_fk nulo foram ignoradas.`,
    );
  }

  console.log(
    `Backfill concluído: ${groups.size} par(es) distinto(s), ${created} linha(s) criada(s) em inventory, ${skippedZero} par(es) com quantidade somada zero (ignorados), ${conflicts.length} conflito(s) (inventory já existia).`,
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
