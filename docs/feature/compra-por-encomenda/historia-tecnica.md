# Historia tecnica - Compra por Encomenda (Backend)

## Identificação

- **Código:** HT-ENCOMENDA-BACK-001
- **Título:** Dois fluxos de pedido independentes — Pronta Entrega (via `inventory`) e Encomenda (produção sob demanda, simulação custo × prazo)
- **Relacionada a:** HF-ENCOMENDA-001
- **Repositório:** `br.thp.zr0.api` (NestJS + Prisma + MySQL)
- **Prioridade:** Alta

## Objetivo técnico

Implementar **dois fluxos de pedido completamente independentes e homogêneos** — nunca um pedido misto:

1. **Pedido de Pronta Entrega** — o fluxo já existente hoje (`shipping` → `checkout` → `orders`), ajustado apenas para usar `inventory` como fonte de estoque e permanecer limitado à quantidade disponível, sem qualquer fallback para produção.
2. **Pedido de Encomenda** — um fluxo novo e dedicado, onde o cliente escolhe livremente a quantidade e o sistema aloca a produção entre Oficinas de Transformação (OTs) com capacidade declarada, apresentando duas simulações completas (**modo custo** e **modo prazo**) antes do checkout. Este fluxo nunca consulta `inventory`; o prazo é sempre calculado assumindo produção do zero.

A entrega também inclui migrar a fonte de verdade do estoque de `transformation_workshop_product.quantity` para o ledger `inventory`/`inventory_entry`/`inventory_exit` (afeta só o fluxo de Pronta Entrega), e corrigir dois defeitos pré-existentes que a feature toca diretamente: ausência de lock de concorrência nas reservas e uso de dimensões genéricas no cálculo de frete — em ambos os fluxos.

> **Nota de escopo:** a versão original deste desenho previa um único pedido com cascata automática estoque → produção ("onda 1" e "onda 2" dentro do mesmo pedido). Essa versão foi descartada após revisão de produto: os dois fluxos agora são jornadas e pedidos completamente separados. O texto abaixo já reflete o modelo revisado.

## Diagnóstico atual

### Modelo de dados (`prisma/schema.prisma`)

- `transformation_workshop_product` (linhas 110-119) é hoje a única fonte de estoque pronto: campo `quantity Int` solto, **sem** `@@unique([transformation_workshop_fk, product_fk])` — nada impede duas linhas para o mesmo par workshop+produto, o que vai exigir agregação de duplicatas antes de qualquer migração.
- `inventory` (linhas 326-337) já existe como ledger correto, com chave composta `@@id([transformation_workshop_fk, product_fk])` e `@@unique` equivalente, mais `inventory_entry` (401-408) e `inventory_exit` (410-417) — mas hoje só é alimentado pelo módulo `src/inventory/`, nenhum dos fluxos de venda (`shipping`, `checkout`, `orders`) lê ou escreve nele.
- `production` (linhas 279-291) é usado apenas pela tela manual da oficina (`ProductionService`): `status String?` é texto livre sem enum, `date_end DateTime?` é opcional, e não existe nenhuma coluna que ligue uma linha de produção a um pedido.
- `order_service` (linhas 224-239) é agrupado hoje só por `transformation_workshop_fk` — isso **não muda** com esta feature, já que um pedido é sempre homogêneo (nunca precisa diferenciar tipo de venda por remessa dentro do mesmo pedido).
- `order` (linhas 204-222) não tem nenhum campo indicando se é um pedido de Pronta Entrega ou de Encomenda.
- `OrderStatus` (linhas 463-471) já define `IN_PRODUCTION`, mas nenhum ponto do código atribui esse valor hoje — o enum existe e está morto; será usado pelo fluxo de Encomenda.
- `stock_reservation` (linhas 339-357) já implementa o padrão de reserva com TTL que a reserva de capacidade de produção vai precisar espelhar.

### `src/shipping/shipping.service.ts`

- `calculate()` (linha 15) lê estoque de `transformation_workshop_product` (linhas 29-33), não de `inventory`.
- `algothmsMoneyShipping()` (linha 134) faz o preenchimento guloso por preço, mas quando a soma de todas as OTs é menor que a quantidade pedida, o `restante` residual simplesmente não é reportado ao chamador — o pedido de Pronta Entrega precisa passar a comunicar esse resíduo explicitamente (como "quantidade não atendível agora"), em vez de descartá-lo silenciosamente.
- `buildShippingContext()` (linha 112) e o `calculate()` da strategy já usam `product.width/height/length/weight` reais (linhas 125-128) — isso funciona bem para a cotação final por OT.
- Já existe `deliveryTime` disponível internamente (`parseShippingApiResponse`, linha 106 da strategy), mas `ShippingService` nunca o propaga — só é relevante para o fluxo de Pronta Entrega escolher a OT mais rápida entre as que já têm estoque, sem envolver produção.

### `src/shipping/strategies/meu-envio-shipping.strategy.ts`

- `calculatePrice()` (linhas 63-97) tem `altura = 20, largura = 20, comprimento = 20, peso = 1` como parâmetros default (linhas 66-69) e é chamado sem nenhum argumento de dimensão — o critério de ordenação por preço usa uma caixa fictícia, não o produto real. Afeta os dois fluxos (Pronta Entrega e Encomenda), já que ambos cotam frete por OT.
- `calculatePrice()` retorna só `preco` (linha 93-96), descartando `delivery_time` mesmo ele estando disponível no payload de resposta.

### `src/checkout/checkout.service.ts`

- `releaseExpiredReservations()` (linhas 96-105) só roda como primeira linha de `reserveStock()` (linha 108) — não há cron nem job agendado no projeto.
- `reserveStock()` (linhas 107-167): dentro do `$transaction` (linha 117), o fluxo é `findFirst` do estoque (linha 131) → `aggregate` das reservas ativas (linha 138) → `create` da nova reserva (linha 154), sem nenhum `SELECT ... FOR UPDATE`/isolamento serializável explícito. Duas chamadas concorrentes para o mesmo par (workshop, produto) podem ambas passar pela checagem de disponibilidade (linha 150) antes de qualquer `create` commitar, permitindo overselling.
- A leitura de estoque na linha 131 também usa `transformation_workshop_product`, não `inventory`.
- Este service continuará servindo **somente** o fluxo de Pronta Entrega; a reserva de capacidade de produção para Encomenda vive num fluxo novo e separado (ver DT-08).

### `src/orders/orders.service.ts`

- Agrupamento por workshop na linha 29: `const workshops = [...new Set(items.map((i) => i.workshopId))]` — permanece assim; não precisa virar `workshop:saleType`, pois este service segue exclusivo do fluxo de Pronta Entrega.
- Checagem de disponibilidade nas linhas 130-140: `availableQuantity` vem de `twProduct.quantity` menos reservas (linha 133); se insuficiente, lança `HttpException('Estoque insuficiente...')` (linhas 136-139). Esse comportamento é **correto e desejado** para o Pedido de Pronta Entrega no modelo revisado — a quantidade deve mesmo ficar limitada ao estoque disponível, sem fallback.
- Baixa de estoque nas linhas 171-180 escreve direto em `transformation_workshop_product.quantity`, ignorando `inventory`/`inventory_exit` — precisa migrar para `inventory`.
- A criação de pedidos de Encomenda **não** passa por este service — ganha um fluxo/módulo dedicado (ver DT-09/DT-10), já que a lógica de origem (produção, não estoque) é totalmente diferente.

### Módulo `production` existente

- `src/production/shared/production.service.ts` é um CRUD manual puro (`create`/`findAll`/`findOne`/`update`/`remove`), sem qualquer lógica de fila/agendamento e sem relação com pedidos. O DTO aceita `status` como string livre.

### Outros pontos que leem `transformation_workshop_product`

- `src/bff/product_bff/shared/product_bff.service.ts`: `OnlyQuantProducts` (linha 13), `QuantProductsUid` (linha 45) e `QuantProducts` (linha 85) somam `transformation_workshop_product.quantity` menos `stock_reservation` — a mesma lógica duplicada três vezes, terá que ser migrada nas três (fluxo de Pronta Entrega).
- `src/bff/transformation_workshop_product_bff/shared/transformation_workshop_bff.service.ts`: `addProductTransformationWorkshop` (linhas 28-65) cria a linha de `transformation_workshop_product` recebendo `quantity` direto do formulário do admin (linha 57); `updateTransformationWorkshop` (linhas 67-100) atualiza a mesma `quantity` (linha 92) — essa tela é a segunda fonte de verdade que precisa deixar de existir.

### Infraestrutura de agendamento

- `package.json` não lista `@nestjs/schedule` entre as dependências; não há nenhuma ocorrência de `@Cron`/`SchedulerRegistry` em `src/`. A limpeza de reservas expiradas hoje só acontece como efeito colateral de uma nova reserva.

## Decisões técnicas propostas

### DT-01 — Novas tabelas: `production_capacity` e `production_reservation`

```prisma
model production_capacity {
  transformation_workshop_fk Int
  transformation_workshop    transformation_workshop @relation(fields: [transformation_workshop_fk], references: [id])
  product_fk                 Int
  product                    product                 @relation(fields: [product_fk], references: [id])
  monthly_capacity           Int
  active                     Boolean @default(false)

  @@id([transformation_workshop_fk, product_fk])
  @@unique([transformation_workshop_fk, product_fk])
}

model production_reservation {
  id                         Int      @id @default(autoincrement())
  product_fk                 Int
  transformation_workshop_fk Int
  quantity                   Int
  user_fk                    Int
  expires_at                 DateTime
  order_fk                   Int?
  estimated_ready_at         DateTime
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt
  // relations espelhando stock_reservation (schema.prisma:339-357)
}
```

Backfill: uma linha `production_capacity` **inativa** para cada par distinto já existente em `transformation_workshop_product` (agregando duplicatas — ver DT-03).

### DT-02 — Extensões e novos enums (sale_type no nível do PEDIDO, não do item/remessa)

```prisma
enum SaleType {
  PRONTA_ENTREGA
  ENCOMENDA
}

enum SimulationMode {
  COST
  DEADLINE
}

enum ProductionFlowStatus {
  QUEUED
  IN_PROGRESS
  DONE
  CANCELLED
}
```

- `order` (schema.prisma:204-222): `+ sale_type SaleType` (obrigatório, define o pedido inteiro), `+ simulation_mode SimulationMode?` (só preenchido para pedidos de Encomenda).
- `production` (schema.prisma:279-291): `+ flow_status ProductionFlowStatus?` (campo novo, **não** renomear/tipar o `status: String?` legado usado pela tela manual) `+ order_item_fk Int? @unique` (null = lançamento manual da oficina; preenchido = fatia de encomenda).
- **`order_service` e `order_item` NÃO recebem `sale_type`** — diferente da versão anterior deste documento. Como um pedido inteiro é sempre homogêneo, o tipo já está em `order.sale_type`; não há necessidade de duplicar por remessa/item. `order_service` continua agrupado só por `transformation_workshop_fk`, como já é hoje.
- `order_service` de Encomenda ganha `+ estimated_ready_at DateTime?` e `+ estimated_delivery_at DateTime?` (preenchidos só quando `order.sale_type = ENCOMENDA`; ficam `null` em pedidos de Pronta Entrega).

### DT-03 — Migração `transformation_workshop_product` → `inventory` (fluxo de Pronta Entrega)

1. Script de backfill agregando por `(transformation_workshop_fk, product_fk)` — necessário porque `transformation_workshop_product` não tem `@@unique` (confirmado: ausente nas linhas 110-119, presente em `inventory` nas linhas 335-336) — soma duplicatas, loga os pares duplicados para revisão manual, e faz upsert em `inventory` + `inventory_entry` usando `InventoryService.add_entry` (`src/inventory/shared/inventory.service.ts:37-68`) como referência de padrão.
2. Trocar leitura/escrita nos pontos já mapeados no diagnóstico:
   - `src/shipping/shipping.service.ts` linhas 29-33 (`product_tw`) e 57-63 (cálculo de `quantity_tw`).
   - `src/orders/orders.service.ts` linhas 40-52 (`workshopProducts`/`workshopProductMap`), linha 133 (`availableQuantity`), linhas 174-179 (decremento).
   - `src/checkout/checkout.service.ts` linha 131 (`stock`).
   - `src/bff/product_bff/shared/product_bff.service.ts`: `OnlyQuantProducts` (13), `QuantProductsUid` (45), `QuantProducts` (85).
3. `src/bff/transformation_workshop_product_bff/shared/transformation_workshop_bff.service.ts`: `addProductTransformationWorkshop` (28-65) passa a criar `inventory` (quantity 0) + `production_capacity` (inactive) em vez de aceitar `quantity` direto; `updateTransformationWorkshop` (67-100) para de escrever em `transformation_workshop_product.quantity`.
4. `transformation_workshop_product.quantity` fica congelado (somente leitura histórica) por um período de transição; remoção definitiva fica fora do escopo imediato.
5. Este é o único ajuste necessário no fluxo de Pronta Entrega — fora a migração de estoque e o lock de concorrência (DT-07) e a correção de frete (DT-06), o fluxo permanece estruturalmente igual ao de hoje.

### DT-04 — Serviço compartilhado de fila/capacidade de produção (usado só pelo fluxo de Encomenda)

Novo arquivo `src/production/shared/production-queue.service.ts`, com duas funções puras:

- `getQueueTail(workshopId, productId)` = `MAX(production.date_end` com `flow_status IN (QUEUED, IN_PROGRESS)`, `production_reservation.estimated_ready_at` ativa, `now())`. `date_end = null` (registros manuais legados) é ignorado no cálculo e apenas logado como alerta — nunca trava a simulação.
- `finishDateFor(workshopId, productId, qty)` = `queueTail + qty * 30 / monthly_capacity` dias — taxa contínua, sem balde mensal; cresce proporcionalmente para pedidos maiores que 1 mês de capacidade sem caso especial. **Este cálculo sempre assume produção do zero** — não há nenhuma lógica que verifique `inventory` para "acelerar" a fatia; se uma OT operacionalmente decidir atender a partir de estoque que já tenha, isso não é modelado nem refletido na data prometida ao cliente (que já é conservadora).

### DT-05 — Algoritmo do Pedido de Encomenda (custo e prazo, multi-OT)

Diferente da versão anterior, este algoritmo **não é mais uma "onda 2 depois de uma onda 1"** — ele roda isoladamente sobre a quantidade total que o cliente escolheu no formulário de Encomenda, sem qualquer consulta a `inventory`.

Fonte de candidatos: `production_capacity.active = true` para o produto, menos fila (`production-queue.service.ts`, DT-04) e `production_reservation` ativas.

- **Modo custo**: como capacidade é uma taxa contínua — não um recurso finito disputado dentro de um único pedido —, o modo custo atribui a quantidade inteira à OT ativa de frete mais barato; só recorre a uma OT alternativa por inviabilidade técnica.
- **Modo prazo** (particionamento entre OTs): problema de scheduling — minimizar o prazo máximo particionando a quantidade entre OTs ativas com filas/taxas/fretes diferentes. Algoritmo guloso incremental por "chunks":
  1. Tamanho do chunk proporcional ao total pedido (ex.: `max(1, ceil(total / 10))`) para limitar iterações.
  2. A cada iteração, atribui um chunk à OT com menor `cursor atual + duração do chunk (finishDateFor) + delivery_time do frete` convertido para base comum.
  3. Atualiza o cursor da OT escolhida e repete até esgotar a quantidade.
- Nuance de unidades: `delivery_time` do Melhor Envio é em dias úteis; duração de produção é em dias corridos — converter dias úteis para uma base comum (aprox. `dias_uteis * 7/5`) antes de somar. Documentar como estimativa, não garantia contratual, no retorno da API.
- Se nenhuma OT tiver `production_capacity.active = true` para o produto, o endpoint retorna explicitamente "pedido indisponível para este produto" (nunca HTTP 200 com dado incompleto nem exceção genérica) — ver RF-11/HF-ENCOMENDA-001.

### DT-06 — Frete com dimensões reais e `delivery_time` propagado (ambos os fluxos)

`meu-envio-shipping.strategy.ts` tem dois defeitos que os dois fluxos expõem:

1. `calculatePrice()` (linhas 63-97) usa dimensões fixas como default (`altura=20, largura=20, comprimento=20, peso=1`, linhas 66-69) e é chamado sem argumentos reais — passa a receber `product.width/height/length/weight` (já existentes no schema, linhas 179-182 de `schema.prisma`), os mesmos já usados corretamente por `buildShippingContext`/`calculate()` (`shipping.service.ts:112-133`).
2. `calculatePrice()` retorna hoje só `preco` (linhas 93-96), descartando `delivery_time` do payload — estender o retorno (ou introduzir `calculateQuote()`) para incluir `delivery_time`, reaproveitando `parseShippingApiResponse` (linha 99-118) que já extrai esse campo.

### DT-07 — Lock de concorrência (ambos os fluxos)

Correção aplicada tanto à reserva de estoque (Pronta Entrega) quanto à nova reserva de capacidade (Encomenda): envolver o bloco leitura→checagem→criação (hoje `findFirst` linha 131 → `aggregate` linha 138 → `create` linha 154 em `checkout.service.ts`, sem lock) em transação com isolamento serializável ou lock explícito por linha (`SELECT ... FOR UPDATE` via `$queryRaw` na linha de `inventory`/`production_capacity` correspondente).

### DT-08 — Checkout e criação do Pedido de Encomenda (fluxo novo e dedicado)

Novo módulo `src/production-order/` (nome sugerido), independente de `src/checkout/` e `src/orders/`, cobrindo o ciclo completo do Pedido de Encomenda:

- `POST /production-order/simulate` — roda o algoritmo de DT-05 para os dois modos, retornando `{ costPlan, deadlinePlan }`, cada um com `shipments[]` (workshop, quantidade, freightCost, estimatedReadyAt, estimatedDeliveryAt), custo total e prazo máximo.
- `POST /production-order/reserve` — recebe o plano escolhido (`simulationMode` + `shipments`), recalcula `finishDateFor` (DT-04) dentro da transação (nunca confia no timestamp da simulação), aplica o lock de concorrência (DT-07) e cria uma `production_reservation` por fatia, com TTL igual ao já usado em `stock_reservation`.
- `POST /production-order` — confirma o pedido: cria `order` com `sale_type = ENCOMENDA` e `simulation_mode` preenchidos, um `order_service` por OT (sem necessidade de `saleType` composto, já que o pedido inteiro é homogêneo), e uma linha `production` por fatia (`flow_status = QUEUED`, `order_item_fk` preenchido), consumindo a `production_reservation` correspondente (mesmo padrão de `updateMany` setando `order_fk`, já usado em `orders.service.ts:218-225` para `stock_reservation`). Nasce em `OrderStatus.PENDING` e transiciona para `IN_PRODUCTION` (enum já existente, hoje nunca atribuído) ao confirmar pagamento.
- `releaseExpiredReservations` (hoje só em `checkout.service.ts:96-105`) precisa de um equivalente para `production_reservation`, reaproveitando a mesma função utilitária se possível.

### DT-09 — Módulo CRUD `production-capacity`

Novo módulo `src/production-capacity/` espelhando a estrutura de `src/inventory/` (`production-capacity.module.ts`, `production-capacity.controller.ts`, `dto/`, `shared/production-capacity.service.ts`), permitindo a OT declarar/editar `monthly_capacity`/`active` por produto. Registrado em `src/app.module.ts` (junto aos 17 módulos já importados, ex. `ProductionModule` na linha 22/49).

### DT-10 — Cron de limpeza de reservas expiradas (ambos os fluxos)

Adicionar dependência `@nestjs/schedule` (ausente hoje em `package.json`, confirmado — nenhum uso de `@Cron`/`SchedulerRegistry` no repositório). Introduzir um serviço leve (ex. `src/checkout/shared/reservation-cleanup.service.ts`) rodando a limpeza de `stock_reservation` **e** `production_reservation` periodicamente via `@Cron(CronExpression.EVERY_5_MINUTES)`, desacoplando a limpeza de "só roda como efeito colateral de uma nova reserva".

## Arquivos previstos

| Área | Arquivos principais |
|---|---|
| Schema/migração | `prisma/schema.prisma`, nova migration em `prisma/migrations/`, script de backfill (novo, ex. `prisma/scripts/backfill-inventory-and-capacity.ts`) |
| Pronta Entrega — estoque | `src/inventory/shared/inventory.service.ts` (referência de padrão), `src/shipping/shipping.service.ts`, `src/orders/orders.service.ts`, `src/checkout/checkout.service.ts`, `src/bff/product_bff/shared/product_bff.service.ts`, `src/bff/transformation_workshop_product_bff/shared/transformation_workshop_bff.service.ts` |
| Fila/capacidade de produção | `src/production/shared/production-queue.service.ts` (novo), `src/production/shared/production.service.ts`, `src/production/production.module.ts` |
| Módulo CRUD capacidade | `src/production-capacity/production-capacity.module.ts` (novo), `production-capacity.controller.ts` (novo), `dto/create-production-capacity.dto.ts` (novo), `shared/production-capacity.service.ts` (novo) |
| Pedido de Encomenda (fluxo novo) | `src/production-order/production-order.module.ts` (novo), `production-order.controller.ts` (novo), `shared/production-order.service.ts` (novo), `dto/simulate-production-order.dto.ts` (novo), `dto/reserve-production-order.dto.ts` (novo), `dto/create-production-order.dto.ts` (novo) |
| Frete | `src/shipping/strategies/meu-envio-shipping.strategy.ts` |
| Reservas e cron | `src/checkout/checkout.service.ts`, `src/checkout/shared/reservation-cleanup.service.ts` (novo, cron) |
| Registro de módulos | `src/app.module.ts` |
| Dependências | `package.json` (`@nestjs/schedule`) |

## Restrições

- Não remover `transformation_workshop_product.quantity` nesta entrega — apenas congelar (deixar de escrever); remoção definitiva é item futuro.
- Não alterar o campo `status: String?` legado de `production` nem a tela manual da oficina que o consome.
- Não recalcular pedidos/reservas já confirmados quando `monthly_capacity` mudar depois — só afeta simulações futuras.
- Não introduzir nenhuma lógica que consulte `inventory` a partir do fluxo de Encomenda — os dois fluxos permanecem estruturalmente isolados.
- Não alterar o agrupamento de `order_service` em `orders.service.ts` (permanece só por `workshopId`).
- Não expor `production_reservation`/`production_capacity` inativa como estoque disponível em nenhuma tela pública.

## Critérios técnicos de aceite

1. `npx prisma migrate dev` aplica o novo schema sem erros; `production_capacity`, `production_reservation` e os enums `SaleType`/`SimulationMode`/`ProductionFlowStatus` existem no banco, com `sale_type` em `order` (não em `order_item`/`order_service`).
2. O backfill de `production_capacity` cobre 100% dos pares `(workshop, produto)` hoje existentes em `transformation_workshop_product`, com duplicatas agregadas e logadas — nenhum par perdido.
3. Um Pedido de Pronta Entrega nunca aceita quantidade maior que o estoque agregado disponível em `inventory` — comportamento igual ao atual, só trocando a fonte de dado.
4. `POST /production-order/simulate` sempre retorna `costPlan` e `deadlinePlan`, sem nunca consultar `inventory`; quando não há OT com `production_capacity.active = true`, o retorno sinaliza "indisponível" explicitamente.
5. Duas chamadas concorrentes de reserva para o mesmo par `(workshop, produto)` — seja em `inventory` (Pronta Entrega) seja em `production_capacity` (Encomenda) — nunca resultam em quantidade reservada além da disponível, validado por teste de concorrência.
6. Um pedido (`order`) criado por qualquer um dos dois fluxos tem `sale_type` preenchido e homogêneo — nunca um pedido com remessas de tipos diferentes.
7. Toda fatia de um Pedido de Encomenda confirmado gera uma linha `production` com `order_item_fk` preenchido e `flow_status = QUEUED`.
8. 100% das chamadas de cotação de frete (Pronta Entrega, Encomenda e checkout) usam `width/height/length/weight` reais do produto — nenhuma chamada usa os defaults `20/20/20/1`.
9. A limpeza de reservas expiradas (estoque e capacidade) roda via cron, independente de uma nova reserva estar sendo criada.
10. Nenhum teste existente em `orders`/`shipping`/`checkout` (`*.spec.ts`) quebra após a migração de `transformation_workshop_product` para `inventory`.

## Estratégia de validação

1. **Schema**: aplicar migration em ambiente de dev, inspecionar tabelas/enums criados e conferir contagem do backfill (`production_capacity` = pares distintos de `transformation_workshop_product`; `inventory` = soma agregada por par).
2. **Fluxo de Pronta Entrega isolado**: produto com 20 unidades em estoque somado entre 2 OTs; pedido de 50 unidades deve ser rejeitado/limitado a 20, sem qualquer sugestão automática de produção dentro do mesmo fluxo.
3. **Fluxo de Encomenda isolado (cenário motivador da escola)**: `production_capacity` de 35/mês (OT A) e 15/mês (OT B) para o mesmo produto; `POST /production-order/simulate` pedindo 30 unidades (ou as 50 completas) deve retornar `costPlan` e `deadlinePlan` fatiando entre as OTs, sem nunca considerar o estoque de 20 unidades já vendido no fluxo de Pronta Entrega.
4. **Concorrência**: disparar duas reservas simultâneas para o mesmo par (workshop, produto) — tanto em `inventory` quanto em `production_capacity` — próximas do limite de disponibilidade, e confirmar que apenas uma é aceita além do limite real.
5. **Checkout → Order (Encomenda)**: `POST /production-order/reserve` seguido de `POST /production-order`, conferindo `production_reservation` consumida, `production` criado com `order_item_fk`, e `order.sale_type = ENCOMENDA`.
6. **Frete**: comparar cotações antes/depois da correção de dimensões para o mesmo produto, confirmando que o preço/prazo muda conforme as dimensões reais, nos dois fluxos.
7. **Regressão de e-mail e telas de OT**: validar manualmente `sendOrder.hbs`/`sendOrderManager.hbs`/`shippingOrder.hbs` e `getOrdersTransformationWorkshop` (`src/bff/transformation_workshop_bff/shared/transformation_workshop_bff.service.ts:161`) exibindo corretamente pedidos de cada tipo.
8. **Suíte automatizada**: rodar `*.spec.ts` existentes em `orders`, `shipping` e `checkout` após cada etapa da migração de estoque.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `production.date_end` nulo em registros manuais legados quebra `MAX()` da fila | Ignorar no cálculo (`getQueueTail`) e logar alerta, sem travar a simulação |
| Mudança de `monthly_capacity` não recalcula compromissos já firmados | Comportamento esperado — documentar explicitamente; só afeta simulações futuras |
| Ausência de cron/job agendado no projeto | Introduzir `@nestjs/schedule` e um serviço leve dedicado (DT-10), isolado do fluxo de reserva |
| Duplicatas em `transformation_workshop_product` (sem `@@unique`) causarem perda de estoque no backfill | Agregar por par antes do upsert e logar todos os pares duplicados para revisão manual antes de rodar em produção |
| Modo prazo com muitas OTs ativas gerar excesso de iterações | Tamanho de chunk proporcional ao total pedido, limitando o número de iterações do algoritmo guloso |
| Unidades incompatíveis (dias úteis do frete vs. dias corridos da produção) gerarem prazos incorretos | Converter e documentar como estimativa, não garantia contratual, na resposta da API |
| Lock de concorrência introduzir contenção/deadlock sob carga | Escopo do lock restrito ao par (workshop, produto); testar com carga concorrente antes de produção |
| Equipe confundir os dois fluxos e tentar reintroduzir cascata entre eles | Deixar explícito, em código e documentação, que `production-order` nunca importa nada de `checkout`/`orders` (e vice-versa) |

## Estratégia de entrega

1. Schema Prisma (DT-01, DT-02) + migração de estoque com backfill (DT-03), validados isoladamente antes de tocar nos serviços de venda.
2. Ajustes pontuais no fluxo de Pronta Entrega existente (`shipping`/`checkout`/`orders`) para ler de `inventory`, sem nenhuma outra mudança estrutural.
3. Serviço de fila/capacidade (DT-04) e módulo CRUD `production-capacity` (DT-09), sem ainda estarem conectados a nenhum fluxo de checkout.
4. Correção de frete (dimensões reais + `delivery_time`, DT-06) e lock de concorrência (DT-07), aplicados aos dois fluxos.
5. Algoritmo do Pedido de Encomenda completo (DT-05) e o novo módulo `production-order` (simulação, reserva e criação, DT-08), validado isoladamente com o cenário da escola.
6. Cron de limpeza de reservas (DT-10), cobrindo as duas tabelas.
7. Regressão de e-mails/telas de OT e suíte de testes existente do fluxo de Pronta Entrega.
