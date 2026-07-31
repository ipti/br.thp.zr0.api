# TASK-01 - Schema Prisma - sale_type no pedido, capacidade e fila de produção

## Metadados

- **Prioridade:** P0
- **Status:** Não iniciada
- **Dependências:** Nenhuma
- **Bloqueia:** TASK-02 a TASK-06

## Objetivo

Adicionar em `prisma/schema.prisma` (`br.thp.zr0.api`) toda a base de dados necessária para a feature "Compra por Encomenda": os novos models `production_capacity` e `production_reservation`, os novos enums `SaleType`, `SimulationMode` e `production_status`, as extensões nos models `order` (que ganha `sale_type` e `simulation_mode`), `order_service` (datas estimadas) e `production` (fila), gerar e revisar a migration Prisma correspondente, aplicá-la no banco de dev e rodar o backfill de `production_capacity` a partir de `transformation_workshop_product`. Esta tarefa é puramente de dados/schema — nenhum service, controller ou DTO em `src/` é alterado aqui.

> **Nota de escopo:** a versão original desta tarefa colocava `sale_type` em `order_service` e `order_item` (um pedido podia ter remessas de tipos diferentes). Isso foi descartado: os dois tipos de pedido (Pronta Entrega e Encomenda) agora são **completamente separados e homogêneos** — `sale_type` vive só no nível do `order`. `order_item` **não** ganha nenhum campo novo nesta task.

## Escopo

**Dentro do escopo:**
- Editar `prisma/schema.prisma`: 2 models novos (`production_capacity`, `production_reservation`), 3 enums novos (`SaleType`, `SimulationMode`, `production_status`), extensões em `order` (`sale_type`, `simulation_mode`), `order_service` (`estimated_ready_at`, `estimated_delivery_at`) e `production` (`production_status`, `order_item_fk`), e as relações reversas correspondentes em `transformation_workshop`, `product`, `users` e `order_item`.
- Gerar a migration com `npm run prisma:create-migration` (script já existente em `package.json:20`).
- Revisar manualmente o `migration.sql` gerado antes de aplicar — há uma coluna `NOT NULL` (`order.sale_type`) sendo adicionada numa tabela já populada, que exige `DEFAULT`.
- Aplicar a migration em dev com `npm run prisma:migrate-dev` (`package.json:17`) e regenerar o Prisma Client.
- Implementar e rodar o backfill de `production_capacity` (uma linha inativa por par já existente em `transformation_workshop_product`), tratando duplicatas.

**Fora do escopo (tarefas seguintes):**
- Qualquer leitura/escrita em `inventory` a partir de `transformation_workshop_product` (TASK-02).
- Serviço de fila (`getQueueTail`/`finishDateFor`) e módulo CRUD `production-capacity` (TASK-03).
- Endpoint `POST /production-order/simulate` e o algoritmo de produção (TASK-04).
- Reserva de capacidade com lock (TASK-05) e criação do Pedido de Encomenda (`POST /production-order`, TASK-06).
- Não renomear, retipar ou remover o campo legado `production.status: String?` (usado hoje pela tela manual da oficina) nem escrever/zerar `transformation_workshop_product.quantity` (permanece congelado).

## Arquivos previstos

- `c:\Projects\Zro\br.thp.zr0.api\prisma\schema.prisma` — edições descritas nos Passos 1 a 7.
- `c:\Projects\Zro\br.thp.zr0.api\prisma\migrations\<timestamp>_add_production_capacity_and_encomenda\migration.sql` — gerado pelo Prisma CLI.
- `c:\Projects\Zro\br.thp.zr0.api\prisma\seed\` — local sugerido para o script de backfill (ex.: `backfill-production-capacity.ts`).
- Nenhum arquivo em `src/` é criado ou alterado nesta tarefa.

## Passos de implementação

1. **Checar drift antes de mexer no schema.** Rodar `npx prisma migrate status` (`DATABASE_URL` em `.env:1`) e confirmar que não há divergência entre `schema.prisma` e o banco real. Só prosseguir se o status estiver limpo.

2. **Adicionar os 3 enums novos**, ao final do arquivo, próximo aos enums existentes (`schema.prisma:451-491`):
   ```prisma
   enum SaleType {
     PRONTA_ENTREGA
     ENCOMENDA
   }

   enum SimulationMode {
     COST
     DEADLINE
   }

   enum production_status {
     QUEUED
     IN_PROGRESS
     DONE
     CANCELLED
   }
   ```

3. **Criar o model `production_capacity`**, mesma granularidade/chave composta de `inventory` (`schema.prisma:326-337`):
   ```prisma
   model production_capacity {
     transformation_workshop_fk Int
     transformation_workshop    transformation_workshop @relation(fields: [transformation_workshop_fk], references: [id])
     product_fk                 Int
     product                    product                 @relation(fields: [product_fk], references: [id])
     monthly_capacity           Int                     @default(0)
     active                     Boolean                 @default(false)
     createdAt                  DateTime                @default(now())
     updatedAt                  DateTime                @updatedAt

     @@id([transformation_workshop_fk, product_fk])
     @@unique([transformation_workshop_fk, product_fk])
   }
   ```

4. **Criar o model `production_reservation`**, espelhando `stock_reservation` (`schema.prisma:339-357`) mais `estimated_ready_at`:
   ```prisma
   model production_reservation {
     id                         Int                     @id @default(autoincrement())
     product_fk                 Int
     product                    product                 @relation(fields: [product_fk], references: [id])
     transformation_workshop_fk Int
     transformation_workshop    transformation_workshop @relation(fields: [transformation_workshop_fk], references: [id])
     quantity                   Int
     user_fk                    Int
     user                       users                   @relation(fields: [user_fk], references: [id])
     expires_at                 DateTime
     order_fk                   Int?
     order                      order?                  @relation(fields: [order_fk], references: [id])
     estimated_ready_at         DateTime
     createdAt                  DateTime                @default(now())
     updatedAt                  DateTime                @updatedAt

     @@index([product_fk, transformation_workshop_fk])
     @@index([user_fk])
     @@index([expires_at])
   }
   ```

5. **Estender o model `production`** (`schema.prisma:279-291`) com `production_status` e `order_item_fk`, sem tocar no campo legado `status`:
   ```prisma
   model production {
     id                         Int                     @id @default(autoincrement())
     product_fk                 Int
     product                    product                 @relation(fields: [product_fk], references: [id])
     transformation_workshop_fk Int
     transformation_workshop    transformation_workshop @relation(fields: [transformation_workshop_fk], references: [id])
     quantity                   Int
     date_start                 DateTime?
     date_end                   DateTime?
     status                     String?
     production_status          production_status?
     order_item_fk              Int?                    @unique
     order_item                 order_item?             @relation(fields: [order_item_fk], references: [id])
     createdAt                  DateTime                @default(now())
     updatedAt                  DateTime                @updatedAt
   }
   ```
   `order_item_fk` nulo = lançamento manual da oficina (inalterado); preenchido = fatia de um Pedido de Encomenda (TASK-06). Isso exige uma relação reversa `production production?` em `order_item` (Passo 7).

6. **Estender `order_service`** (`schema.prisma:224-239`) **só** com as datas estimadas — sem `sale_type` (o tipo já vem do `order` pai):
   ```prisma
   model order_service {
     id                         Int                      @id @default(autoincrement())
     uid                        String                   @unique
     transformation_workshop_fk Int?
     transformation_workshop    transformation_workshop? @relation(fields: [transformation_workshop_fk], references: [id])
     status                     OrderStatus              @default(PENDING)
     total_amount               Float                    @default(0)
     tracking_code              String?
     tracking_carrier           String?
     estimated_ready_at         DateTime?
     estimated_delivery_at      DateTime?
     createdAt                  DateTime                 @default(now())
     updatedAt                  DateTime                 @updatedAt

     order_item order_item[]
     order      order?       @relation(fields: [order_fk], references: [id])
     order_fk   Int?
   }
   ```
   Datas ficam `null` para `order_service` de pedidos de Pronta Entrega (preenchidas só quando o `order` pai é `ENCOMENDA`).

7. **Adicionar a relação reversa em `order_item`** (`schema.prisma:258-277`), exigida pela FK única do Passo 5 — **nenhum outro campo novo neste model**:
   ```prisma
   model order_item {
     id Int @id @default(autoincrement())

     product_fk Int
     product    product @relation(fields: [product_fk], references: [id])

     variant_fk Int?
     variant    product_variant? @relation(fields: [variant_fk], references: [id])

     quantity    Int
     unit_price  Float
     total_price Float

     delivery_estimate Json?

     createdAt        DateTime       @default(now())
     updatedAt        DateTime       @updatedAt
     order_service    order_service? @relation(fields: [order_service_fk], references: [id])
     order_service_fk Int?
     production       production?
   }
   ```

8. **Estender o model `order`** (`schema.prisma:204-222`) com `sale_type` **(obrigatório)** e `simulation_mode` (opcional), mais a relação reversa para `production_reservation`:
   ```prisma
   model order {
     id                     Int                     @id @default(autoincrement())
     uid                    String                  @unique
     user_fk                Int
     user                   users                   @relation(fields: [user_fk], references: [id])
     total_amount           Float                   @default(0)
     notes                  String?                 @db.VarChar(500)
     payment_status         PaymentStatus           @default(PENDING)
     payment_method         PaymentMethod?
     payment_intent_id      String?                 @unique
     discount_amount        Float                   @default(0)
     coupon_fk              Int?
     coupon                 coupon?                 @relation(fields: [coupon_fk], references: [id])
     order_delivery_address order_delivery_address?
     sale_type              SaleType                @default(PRONTA_ENTREGA)
     simulation_mode        SimulationMode?
     createdAt              DateTime                @default(now())
     updatedAt              DateTime                @updatedAt
     order_services         order_service[]
     stock_reservation      stock_reservation[]
     production_reservation production_reservation[]
   }
   ```
   `@default(PRONTA_ENTREGA)` é obrigatório: `order` já tem linhas reais, então `ADD COLUMN ... NOT NULL` sem `DEFAULT` falha em MySQL. Todo pedido já existente é retroativamente classificado como Pronta Entrega (correto, já que a Encomenda não existia antes desta feature). `simulation_mode` fica nulo para pedidos de Pronta Entrega, que nunca passam por simulação custo × prazo.

9. **Adicionar as relações reversas** exigidas nos models referenciados pelos novos models:
   - `transformation_workshop` (`schema.prisma:86-108`): `+ production_capacity production_capacity[]`, `+ production_reservation production_reservation[]`.
   - `product` (`schema.prisma:169-194`): `+ production_capacity production_capacity[]`, `+ production_reservation production_reservation[]`.
   - `users` (`schema.prisma:17-35`): `+ production_reservation production_reservation[]`.

10. **Rodar `npx prisma format` e `npx prisma validate`** antes de gerar a migration.

11. **Gerar a migration** com `npm run prisma:create-migration -- --name add_production_capacity_and_encomenda` (`--create-only`, permitindo revisão manual do SQL antes de aplicar):
    - Confirmar que `ALTER TABLE order ADD COLUMN sale_type ... DEFAULT 'PRONTA_ENTREGA'` está presente (não apenas `NOT NULL`).
    - Confirmar que `production_capacity`/`production_reservation` nascem como `CREATE TABLE` simples.
    - Confirmar que `production`/`order_service` ganham colunas opcionais, sem exigir `DEFAULT`.
    - **Implementar o backfill de `production_capacity`** nesta etapa (SQL bruto no `migration.sql` ou script `prisma/seed/backfill-production-capacity.ts`): para cada par `(transformation_workshop_fk, product_fk)` em `transformation_workshop_product`, inserir uma linha em `production_capacity` com `monthly_capacity=0`, `active=false`. Como `transformation_workshop_product` não tem `@@unique` composto, agregar (`GROUP BY`) antes do upsert e logar duplicatas para revisão manual.

12. **Aplicar a migration em dev** com `npm run prisma:migrate-dev` e confirmar que o Prisma Client regenerado expõe `production_capacity`, `production_reservation`, `SaleType`, `SimulationMode`, `production_status`.

13. **Validar o backfill**: `COUNT(DISTINCT transformation_workshop_fk, product_fk)` em `transformation_workshop_product` deve bater com `COUNT(*)` em `production_capacity` (`active=false`).

## Critérios de aceite

- `npx prisma validate`/`format` sem erros; migration aplicada sem drift.
- `order.sale_type` existe, é obrigatório, com `DEFAULT 'PRONTA_ENTREGA'` aplicado retroativamente a todos os pedidos já existentes.
- `order_service`/`order_item` **não** têm campo `sale_type` — confirmar explicitamente que essa mudança de design (versus a versão anterior deste documento) foi respeitada.
- `production.order_item_fk` é único; `production.status` (legado) permanece intocado.
- Cada par `(workshop, produto)` de `transformation_workshop_product` tem exatamente uma linha em `production_capacity` (`active=false`); duplicatas agregadas e logadas.
- Nenhum arquivo em `src/` foi alterado.

## Validação

- `npx prisma validate`/`format`, `npx prisma migrate status` antes/depois.
- Leitura manual do `migration.sql` gerado, conferindo o `DEFAULT` em `order.sale_type`.
- `npm run prisma:migrate-dev` contra o banco de dev.
- Query manual comparando contagens de `transformation_workshop_product` agregado vs. `production_capacity`.
- `npm run build`/`npm run lint` sem novos erros (deve ser no-op de lint, já que nenhum `.ts` foi tocado).

## Riscos

- `ALTER TABLE order ADD COLUMN sale_type ... NOT NULL` sem `DEFAULT` falha em MySQL com a tabela já populada.
- `transformation_workshop_product` sem `@@unique` composto pode ter duplicatas que quebram o backfill de `production_capacity` se não forem agregadas antes.
- Drift entre `schema.prisma` e o banco de dev (migrations aplicadas fora do fluxo `migrate`) pode forçar um reset destrutivo.

## Mitigação

- Declarar `@default(PRONTA_ENTREGA)` explicitamente em `order.sale_type` e revisar o `migration.sql` (`--create-only`) antes de aplicar.
- Agregar `transformation_workshop_product` por par antes do upsert em `production_capacity`, logando duplicatas.
- Rodar `npx prisma migrate status` antes de qualquer alteração; nunca usar `migrate reset` num banco com dados reais.
