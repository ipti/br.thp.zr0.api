# TASK-03 - Servico de fila e capacidade de producao (production-queue e production-capacity)

## Metadados

- **Prioridade:** P0
- **Status:** Não iniciada
- **Dependências:** TASK-01
- **Bloqueia:** TASK-04

## Objetivo

Implementar o serviço compartilhado que calcula a fila (backlog) de produção e a data de disponibilidade de uma fatia do **Pedido de Encomenda** por par (oficina/OT, produto), além do módulo CRUD que permite a cada `transformation_workshop` declarar e editar sua capacidade mensal de produção por produto. Este serviço é o bloco de baixo nível que o algoritmo de simulação do Pedido de Encomenda (TASK-04) vai consumir para decidir quanto tempo cada OT leva para entregar uma fatia — sem esta task, a simulação de encomenda não tem de onde ler capacidade nem fila. **Este serviço nunca é consultado pelo fluxo de Pronta Entrega** (TASK-02) — os dois fluxos são independentes.

Esta task **não** implementa o ranking por custo/prazo, o particionamento entre OTs, nem o endpoint `POST /production-order/simulate` (tudo isso é TASK-04). Também não cria/expira reservas de capacidade (`production_reservation` no papel de escrita é TASK-05) — aqui `production_reservation` só é **lida** para compor a fila.

## Escopo

- Criar `ProductionQueueService` com dois métodos públicos centrais: `getQueueTail(workshopId, productId)` e `finishDateFor(workshopId, productId, quantity)`, implementando literalmente as fórmulas descritas no plano (seção "Algoritmo de alocação — Onda 2", linhas 39-44 do plano).
- Criar o módulo `production-capacity`, um CRUD simples espelhando exatamente o padrão já usado em `src/inventory/` (mesma chave composta `transformation_workshop_fk + product_fk`), para a OT declarar/editar `monthly_capacity` e `active`.
- Registrar o novo módulo em `src/app.module.ts` e exportar `ProductionQueueService` do `ProductionModule` existente para que outros módulos (a partir da TASK-04, via `ShippingModule`) possam injetá-lo.
- Tratar explicitamente, dentro do próprio serviço, os dois riscos já mapeados no plano para esta camada: `production.date_end = null` em registros legados (não travar o cálculo, só alertar) e produto sem `production_capacity` ativa (erro de domínio explícito, não `NaN`/exceção genérica).
- Fora de escopo nesta task: algoritmo guloso de particionamento entre OTs (modo prazo), integração com `MeuEnvioShippingStrategy`/`delivery_time`, endpoint `POST /production-order/simulate`, lock de concorrência via `SELECT ... FOR UPDATE` e criação de `production_reservation` (TASK-05), criação de linhas em `production` a partir de pedidos confirmados (TASK-06).

## Arquivos previstos

**Novos:**
- `src/production/shared/production-queue.service.ts` — serviço principal desta task (`getQueueTail`, `finishDateFor`, `getActiveCapacity`, classe de erro `ProductionCapacityUnavailableError`).
- `src/production/shared/production-queue.service.spec.ts` — testes unitários com `PrismaService` mockado.
- `src/production-capacity/production-capacity.module.ts` — módulo Nest, no padrão de `src/inventory/inventory.module.ts`.
- `src/production-capacity/production-capacity.controller.ts` — rotas CRUD, no padrão de `src/inventory/inventory.controller.ts`.
- `src/production-capacity/shared/production-capacity.service.ts` — lógica de CRUD, no padrão de `src/inventory/shared/inventory.service.ts`.
- `src/production-capacity/dto/create-production-capacity.dto.ts`
- `src/production-capacity/dto/update-production-capacity.dto.ts`
- `src/production-capacity/dto/query-production-capacity.dto.ts` (estende `src/common/dto/pagination.dto.ts`, igual `QueryInventoryDto`)
- `src/production-capacity/doc/production-capacity.response.ts` — resposta Swagger, no padrão de `src/inventory/doc/inventory.response.ts`.

**Editados:**
- `src/production/production.module.ts` — adicionar `ProductionQueueService` aos `providers` e criar `exports: [ProductionService, ProductionQueueService]` (hoje o módulo não exporta nada).
- `src/app.module.ts` — importar e registrar `ProductionCapacityModule` na lista de módulos (ao lado de `ProductionModule`, `InventoryModule`, linhas 22/24 e 49/51 do arquivo atual).

**Somente leitura/consulta (não alterar nesta task, servem de contrato):**
- `prisma/schema.prisma` — models `production_capacity` e `production_reservation` (criados na TASK-01) e o model `production` (`schema.prisma:279`) com o novo enum `production_status` e a coluna `order_item_fk`.
- `src/inventory/shared/inventory.service.ts` e `src/inventory/inventory.controller.ts` — referência direta de padrão para o novo CRUD (uso de `connect` via chave composta Prisma `transformation_workshop_fk_product_fk`, ver `inventory.service.ts:41-48` e `:84-89`).

## Passos de implementação

1. **Confirmar o schema herdado da TASK-01** antes de codar: `production_capacity` (chave composta única `transformation_workshop_fk + product_fk`, campos `monthly_capacity Int`, `active Boolean`), `production_reservation` (mesmos campos de `stock_reservation` — `product_fk`, `transformation_workshop_fk`, `quantity`, `user_fk`, `expires_at`, `order_fk` — mais `estimated_ready_at DateTime`), e o `production` (`schema.prisma:279`) com o enum novo `production_status` (`QUEUED/IN_PROGRESS/DONE/CANCELLED`) e `order_item_fk Int? @unique`, sem alterar o `status: String?` legado. Rodar `npx prisma generate` para atualizar o Prisma Client com os novos models/enum antes de escrever qualquer código que os referencie.

2. **Criar o módulo `production-capacity`** replicando literalmente a estrutura de `src/inventory/`:
   - `CreateProductionCapacityDto`: `idProduct: number`, `idTransformationWorkshop: number`, `monthlyCapacity: number`, `active?: boolean` (default `false`, coerente com o backfill inativo já feito pela TASK-01/TASK-02 sobre `transformation_workshop_product`).
   - `UpdateProductionCapacityDto`: mesmos campos opcionais (`PartialType` ou padrão já usado em `update-inventory.dto.ts`).
   - `QueryProductionCapacityDto extends PaginationDto`: `idProduct?`, `idTransformationWorkshop?`, `active?`.
   - `ProductionCapacityService`: `create` (usa `connect` composto, igual `inventory.service.ts:17-23`), `findAll` (paginado, mesmo formato de retorno `{ data, pagination: { page, limit, total, totalPages } }` de `InventoryService.findAll`), `findOne(transformation_workshop_fk, product_fk)`, `update(transformation_workshop_fk, product_fk, dto)`, `remove(transformation_workshop_fk, product_fk)` — todos usando o identificador composto `transformation_workshop_fk_product_fk` gerado pelo Prisma para o `@@unique`, exatamente como em `inventory.service.ts:41-48`, `:146-152`, `:169-174`.
   - `ProductionCapacityController`: rotas `POST /production-capacity`, `GET /production-capacity`, `GET /production-capacity/:transformation_workshop_fk/:product_fk`, `PATCH /production-capacity/:transformation_workshop_fk/:product_fk`, `DELETE /production-capacity/:transformation_workshop_fk/:product_fk`, protegidas por `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth('access-token')`, igual `inventory.controller.ts`.
   - `ProductionCapacityModule`: `imports: [PrismaModule]`, `controllers: [ProductionCapacityController]`, `providers: [ProductionCapacityService]` — igual `inventory.module.ts`.
   - Este CRUD é o mesmo módulo citado no plano em "Novos endpoints/DTOs" (linha 66): "Novo módulo `production-capacity` (mesmo padrão CRUD de `src/inventory/`) para a OT declarar/editar sua capacidade mensal por produto. Registrar em `src/app.module.ts`."

3. **Implementar `getQueueTail(workshopId: number, productId: number): Promise<Date>`** em `src/production/shared/production-queue.service.ts`, seguindo a fórmula do plano (linha 40): `MAX(production.date_end` em aberto`, production_reservation.estimated_ready_at` ativa`, now)`.
   - Query A — `prisma.production.aggregate({ where: { transformation_workshop_fk: workshopId, product_fk: productId, production_status: { in: ['QUEUED', 'IN_PROGRESS'] } }, _max: { date_end: true } })`. O Prisma `_max` já ignora `null` automaticamente, mas antes de agregar, buscar (ou logar via `findMany` com `select: { id: true, date_end: true }` filtrado por `date_end: null`) os registros abertos com `date_end` nulo e emitir `Logger.warn` citando `workshop_fk`/`product_fk`/`production.id` — implementa o risco descrito no plano ("`production.date_end` é opcional hoje; registros manuais antigos com `date_end = null` quebram o `MAX()` da fila — tratar como 'ignorar no cálculo, mas alertar/logar', sem travar a simulação").
   - Query B — `prisma.production_reservation.aggregate({ where: { transformation_workshop_fk: workshopId, product_fk: productId, expires_at: { gt: new Date() } }, _max: { estimated_ready_at: true } })`.
   - Retornar `max(dateEndMax ?? epoch, estimatedReadyAtMax ?? epoch, now)`.
   - Importante: a query A **não filtra por `order_item_fk`** — deve considerar tanto lançamentos manuais da oficina (`order_item_fk = null`) quanto fatias de encomenda (`order_item_fk` preenchido), conforme o plano explicita na justificativa de reaproveitar `production` em vez de criar tabela de backlog separada (linha 28: "o cálculo de fila (`MAX(date_end)` de tudo em `QUEUED/IN_PROGRESS`) precisa considerar tanto lançamentos manuais quanto os de pedido").

4. **Implementar `getActiveCapacity(workshopId, productId)`** — busca única em `prisma.production_capacity.findUnique({ where: { transformation_workshop_fk_product_fk: { transformation_workshop_fk: workshopId, product_fk: productId } } })`, retornando `null` se não existir ou se `active === false`. Extrair como método próprio (em vez de inline dentro de `finishDateFor`) porque a TASK-04 vai precisar da mesma checagem tanto no modo custo quanto no modo prazo, para decidir se uma OT é candidata à onda 2.

5. **Implementar `finishDateFor(workshopId: number, productId: number, quantity: number): Promise<Date>`**:
   - Chamar `getActiveCapacity(workshopId, productId)`; se `null`, lançar `ProductionCapacityUnavailableError` (classe de erro nova, exportada do mesmo arquivo, com `workshopId`/`productId` como propriedades) — é o gancho que a TASK-04 vai capturar para responder "pedido indisponível para este produto" em vez de deixar a simulação de encomenda falhar silenciosamente ou retornar dado incompleto.
   - `const queueTail = await this.getQueueTail(workshopId, productId)`.
   - `const durationDays = quantity * 30 / capacity.monthly_capacity` — fórmula literal do plano (linha 41: "taxa contínua — cresce proporcionalmente para pedidos maiores que 1 mês de capacidade, sem caso especial"), **sem** arredondamento por mês nem teto de capacidade.
   - Retornar `new Date(queueTail.getTime() + durationDays * 86400000)`.
   - Não fazer nenhuma escrita (nem em `production`, nem em `production_reservation`) — este método é somente leitura/cálculo; a persistência dentro de transação com lock é da TASK-05 (o plano já antecipa isso: "para `ENCOMENDA`, recalcula `finishDateFor` dentro da transação").

6. **Registrar exports no `ProductionModule`** (`src/production/production.module.ts`): adicionar `ProductionQueueService` a `providers` e criar a chave `exports: [ProductionService, ProductionQueueService]` (o módulo hoje não exporta nada). Isso permite que a TASK-04 faça `imports: [ProductionModule]` no `ShippingModule` e injete `ProductionQueueService` sem duplicar lógica.

7. **Registrar `ProductionCapacityModule` em `src/app.module.ts`**, seguindo o padrão de import/registro dos módulos já existentes (ex.: linhas 22 e 49 para `ProductionModule`, linhas 24 e 51 para `InventoryModule`).

8. **Escrever `production-queue.service.spec.ts`** cobrindo, no mínimo:
   - Fila vazia (nenhum `production` aberto, nenhuma `production_reservation` ativa) → `getQueueTail` retorna aproximadamente `now`.
   - `production.date_end` no futuro, sem reservas → `getQueueTail` retorna essa data.
   - `production_reservation.estimated_ready_at` mais distante que `production.date_end` → `getQueueTail` retorna o maior dos dois valores.
   - Registro `QUEUED` com `date_end = null` misturado a registros válidos → não lança exceção, `Logger.warn` é chamado, resultado considera apenas os registros com data.
   - `finishDateFor` sem `production_capacity` (ou com `active=false`) para o par → lança `ProductionCapacityUnavailableError`.
   - `finishDateFor` reproduzindo o cenário motivador do plano: `monthly_capacity=35` (OT A) e `monthly_capacity=15` (OT B), fila vazia, pedido de 30 unidades → validar que a duração calculada é proporcional (`30 * 30/35 ≈ 25,7 dias` para A; `30 * 30/15 = 60 dias` para B), confirmando que pedidos maiores que a capacidade mensal simplesmente empurram a data para frente, sem regra especial (plano, linha 12).

## Critérios de aceite

- `production-capacity` expõe CRUD completo (`create`/`findAll`/`findOne`/`update`/`remove`) com o mesmo contrato de paginação usado em `inventory` (`page`, `limit`, `pagination.totalPages`).
- `ProductionQueueService.getQueueTail` considera lançamentos manuais e de pedido juntos (não filtra por `order_item_fk`).
- `ProductionQueueService.getQueueTail` nunca lança exceção por causa de `production.date_end` nulo em registros abertos — apenas loga um aviso e ignora o registro no `MAX()`.
- `ProductionQueueService.finishDateFor` lança um erro de domínio tipado e explícito (`ProductionCapacityUnavailableError`) quando não existe `production_capacity` ativa para o par (oficina, produto) — nunca retorna `NaN`/`Invalid Date` silenciosamente.
- A fórmula de `finishDateFor` é estritamente `queueTail + quantity * 30 / monthly_capacity` dias, sem arredondamento por "balde mensal" e sem caso especial para quantidades acima de 1 mês de capacidade.
- `ProductionModule` exporta `ProductionQueueService`; `ProductionCapacityModule` está registrado em `src/app.module.ts`.
- Nenhuma alteração de comportamento em `stock_reservation`, `inventory`, `orders.service.ts`, `checkout.service.ts` ou `shipping.service.ts` nesta task — este serviço ainda não é consumido por ninguém (a integração é da TASK-04).
- Nenhuma criação/expiração de `production_reservation` acontece nesta task (somente leitura, via `getQueueTail`).

## Validação

- `npx prisma generate` roda sem erros e o client reconhece `production_capacity`, `production_reservation` e o enum `production_status`.
- `npm run test -- production-queue` (ou o runner de testes configurado no projeto) passa cobrindo todos os casos listados no passo 8.
- `npm run test -- production-capacity` (se for criado spec do CRUD, opcional mas recomendado, no padrão de `inventory` que hoje não tem spec dedicado) ou teste manual via REST client: `POST /production-capacity` para um par (workshop, product) existente, `GET /production-capacity` paginado, `PATCH`/`DELETE` no mesmo par.
- Reproduzir manualmente (via teste de integração leve, script ou console Nest) o cenário motivador do plano: OT A `monthly_capacity=35`, OT B `monthly_capacity=15`, fila vazia, chamar `finishDateFor` para 30 unidades em cada OT e conferir que as datas retornadas são proporcionalmente diferentes conforme a fórmula.
- `npm run build` e `npm run lint` do projeto (`br.thp.zr0.api`) sem novos erros introduzidos pelos arquivos desta task.

## Riscos

- `production.date_end` é opcional e há registros manuais legados sem essa data; se todos os registros abertos de um par estiverem com `date_end = null`, o backlog calculado pareceria "vazio" mesmo havendo trabalho em andamento, mascarando o prazo real.
- Um erro de domínio não tipado corretamente para "sem capacidade ativa" pode ser confundido com uma exceção HTTP genérica, quebrando o contrato que a TASK-04 espera para produzir a resposta explícita de "quantidade indisponível" por produto.
- Alteração de `monthly_capacity` durante o cálculo (sem lock nesta task) pode gerar leitura inconsistente entre a checagem de capacidade e o cálculo de `finishDateFor` dentro de uma mesma chamada de simulação — aceitável nesta fase porque é só leitura para simulação, não persistência.

## Mitigação

- Logar (nível `warn`, via `Logger` do NestJS) todo registro de `production` em aberto (`QUEUED`/`IN_PROGRESS`) com `date_end = null` encontrado em `getQueueTail`, citando `transformation_workshop_fk`, `product_fk` e `production.id`, para permitir auditoria manual sem travar a simulação — mesma abordagem descrita no plano na seção "Riscos e pontos de atenção" (linha 75).
- Criar e exportar a classe `ProductionCapacityUnavailableError extends Error` em `production-queue.service.ts`, documentada no cabeçalho do arquivo, para que a TASK-04 possa fazer `catch` específico dessa exceção e montar a resposta "quantidade indisponível" sem tratá-la como erro 500 genérico.
- Documentar explicitamente (comentário no código e nesta task) que `finishDateFor`/`getQueueTail` são cálculos de simulação sem lock nesta etapa; a leitura autoritativa dentro de transação com `SELECT ... FOR UPDATE` e a criação de `production_reservation` são responsabilidade da TASK-05 (`reserveAllocation`), que deve re-executar `finishDateFor` dentro da própria transação antes de persistir, conforme já antecipado no plano.