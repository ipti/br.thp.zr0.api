# TASK-02 - Migração do fluxo de Pronta Entrega para inventory

## Metadados

- **Prioridade:** P0
- **Status:** Não iniciada
- **Dependências:** TASK-01 (Schema Prisma — tabelas/enums novos)
- **Bloqueia:** Nenhuma

> **Nota de escopo:** esta tarefa não bloqueia mais nenhuma outra. Na versão anterior deste desenho, ela era pré-requisito da "onda 1" dentro de um algoritmo de simulação combinado. Com a separação em dois pedidos independentes, o Pedido de Encomenda (TASK-03 a TASK-06) **nunca consulta `inventory`** — os dois fluxos evoluem em paralelo, sem dependência entre si.

## Objetivo

Trocar a fonte de verdade do estoque do **Pedido de Pronta Entrega** de `transformation_workshop_product.quantity` (contador simples, sem histórico) para `inventory` (ledger já existente no schema, com `inventory_entry`/`inventory_exit`), em todos os pontos do backend que hoje leem ou escrevem estoque, e corrigir a falta de lock de concorrência na reserva de estoque (`checkout.service.ts`) — já que esta tarefa está reescrevendo exatamente o trecho de leitura/checagem de disponibilidade. O comportamento do fluxo de Pronta Entrega em si (limitado ao que está disponível, sem fallback para produção) **não muda** — só a fonte de dado e a robustez sob concorrência.

Importante: o módulo `inventory` **já existe e já está registrado** em `src/app.module.ts:24,51` (`InventoryModule`), com CRUD completo em `src/inventory/` (`inventory.controller.ts`, `shared/inventory.service.ts`, DTOs) e os modelos `inventory` (`prisma/schema.prisma:326-337`), `inventory_entry` (`prisma/schema.prisma:401-408`) e `inventory_exit` (`prisma/schema.prisma:410-417`) já estão declarados. Esta tarefa **não cria schema novo** — ela (1) popula `inventory` a partir dos dados hoje presos em `transformation_workshop_product`, e (2) redireciona os cinco pontos de leitura/escrita de estoque do fluxo de vendas (`shipping`, `orders`, `checkout`, `product_bff`, `transformation_workshop_product_bff`) para usar `inventory` em vez de `transformation_workshop_product`. Hoje, quando a soma do estoque disponível de todas as OTs é menor que a quantidade pedida, `orders.service.ts` lança `HttpException('Estoque insuficiente...')` em `src/orders/orders.service.ts:135-140` — esse comportamento de "falha dura" continua sendo o esperado *dentro desta tarefa* (a divisão em onda 2/produção só é adicionada na TASK-04); o que muda aqui é apenas de onde vem o número de "estoque disponível".

## Escopo

### Incluído

- Script de backfill único (`prisma/scripts/backfill-inventory-from-tw-product.ts`) que migra os dados históricos de `transformation_workshop_product.quantity` para `inventory` + `inventory_entry`, tratando duplicatas (ver "Passos de implementação", item 1).
- Troca do modelo Prisma consultado em:
  - `src/shipping/shipping.service.ts` (leitura, `ShippingService.calculate`, linhas 29-33 e 57-63).
  - `src/orders/orders.service.ts` (leitura e escrita, `OrdersService.create`, linhas 40-52, 133, 135-140, 174-179).
  - `src/checkout/checkout.service.ts` (leitura, `CheckoutService.reserveStock`, linha 131, dentro do método que começa na linha 107).
  - `src/bff/product_bff/shared/product_bff.service.ts` (leitura, três métodos: `OnlyQuantProducts` linhas 13-43, `QuantProductsUid` linhas 45-83, `QuantProducts` linhas 85-115).
- Mudança de comportamento da tela de admin de associação produto↔OT (`src/bff/transformation_workshop_product_bff/shared/transformation_workshop_bff.service.ts`):
  - `addProductTransformationWorkshop` (linhas 28-65): para de gravar o `quantity` recebido do admin em `transformation_workshop_product.quantity` (linha 57); passa a criar `inventory` (quantity 0) e `production_capacity` (inactive) para o mesmo par `(tw_fk, product_fk)`, exatamente como descrito na seção "Migração `transformation_workshop_product` → `inventory`", item 3, do plano.
  - `updateTransformationWorkshop` (linhas 67-100): para de gravar `quantity` (linha 92) em `transformation_workshop_product` — esse campo passa a ser somente leitura/congelado a partir desta tarefa.
- Congelamento formal de `transformation_workshop_product.quantity`: comentário `/// @deprecated` no schema (`prisma/schema.prisma:114`) documentando que o campo não deve mais ser escrito por nenhum serviço.
- Atualização dos specs que quebrariam com a troca (`shipping.service.spec.ts`, `checkout.service.spec.ts`, `orders.service.spec.ts` — ver observação em "Arquivos previstos" sobre o estado atual deles).

### Incluído (revisão de escopo — antes estava em outra tarefa)

- **Lock de concorrência** (`SELECT ... FOR UPDATE` via `tx.$queryRaw`) na leitura de `inventory` dentro de `CheckoutService.reserveStock` (`checkout.service.ts:107-167`) — corrige o bug pré-existente nº 1 do plano (overselling por reserva concorrente sem lock) exatamente no ponto que esta tarefa já está reescrevendo (troca de `transformation_workshop_product` para `inventory`). A tarefa equivalente de Encomenda (TASK-05) implementa o mesmo padrão de lock, de forma independente, sobre `production_capacity`.

### Fora do escopo desta tarefa

- **Backfill em massa de `production_capacity`** para todos os pares já existentes em `transformation_workshop_product` (mencionado no plano na seção "Novas tabelas", não na seção "Migração") — isso é responsabilidade da TASK-01 (schema) ou da TASK-03 (módulo `production-capacity`), pois `production_capacity` é um domínio de dados que essas tarefas possuem. Esta tarefa garante apenas que **pares criados a partir de agora** (via `addProductTransformationWorkshop`) já nasçam com as duas linhas gêmeas (`inventory` + `production_capacity`); confirmar com quem implementar TASK-01/TASK-03 que o backfill histórico de `production_capacity` foi coberto em algum lugar, para não haver lacuna entre as duas tarefas.
- Onda 2 (produção sob encomenda), algoritmo de simulação custo/prazo, endpoint `POST /shipping/simulate` — tudo isso é TASK-04.
- Remoção física de `transformation_workshop_product.quantity` do schema — o plano trata isso como fora do escopo imediato (item 4 da seção "Migração"), mantendo o campo congelado por um período de transição.
- Dimensões reais de frete (`meu-envio-shipping.strategy.ts`) — bug pré-existente nº 2 do plano, escopo da TASK-07.

## Arquivos previstos

| Arquivo | Tipo de mudança |
|---|---|
| `prisma/scripts/backfill-inventory-from-tw-product.ts` | Novo — script de backfill único, executado manualmente via `ts-node` |
| `package.json` | Editar — novo script npm, ex. `"migrate:inventory-backfill": "ts-node --transpile-only prisma/scripts/backfill-inventory-from-tw-product.ts"` |
| `prisma/schema.prisma` | Editar — comentário `@deprecated` acima do campo `quantity` do model `transformation_workshop_product` (linha 114) |
| `src/shipping/shipping.service.ts` | Editar — `calculate()`, linhas 29-33 (query) e 57-63 (uso de `p.quantity`) |
| `src/orders/orders.service.ts` | Editar — `create()`, linhas 40-52 (query), 133 (cálculo de disponível), 135-140 (erro de estoque insuficiente), 174-179 (decremento no fechamento do pedido) |
| `src/checkout/checkout.service.ts` | Editar — `reserveStock()`, linha 131 (leitura dentro da transação iniciada na linha 117) |
| `src/bff/product_bff/shared/product_bff.service.ts` | Editar — `OnlyQuantProducts`, `QuantProductsUid`, `QuantProducts` |
| `src/bff/transformation_workshop_product_bff/shared/transformation_workshop_bff.service.ts` | Editar — `addProductTransformationWorkshop`, `updateTransformationWorkshop` |
| `src/bff/transformation_workshop_product_bff/dto/transformation_workshop_product_update.dto.ts` | Revisar — hoje só tem o campo `quantity` (linha 12); ao remover o uso desse campo em `updateTransformationWorkshop`, decidir se o DTO fica vazio/deprecated ou se ganha novos campos futuros (fora do escopo, só não deixar o DTO "morto" sem explicação) |
| `src/shipping/shipping.service.spec.ts`, `src/checkout/checkout.service.spec.ts`, `src/orders/orders.service.spec.ts` | Revisar — hoje são apenas stubs gerados pelo Nest CLI (`should be defined`, sem mocks de Prisma nem cobertura real da lógica de estoque); ao alterar os serviços, garantir que continuam compilando e, se possível, aproveitar para adicionar o primeiro teste real que mocka `prisma.inventory` em vez de `prisma.transformation_workshop_product` |
| `src/inventory/shared/inventory.service.ts` | Consultar como referência (não necessariamente editar) — `add_entry` (linha 37), `add_exit` (linha 70) e `update` (linha 161) mostram o padrão de escrita em `inventory`/`inventory_entry`/`inventory_exit` já validado no projeto |

## Passos de implementação

1. **Script de backfill (`prisma/scripts/backfill-inventory-from-tw-product.ts`)**, no mesmo estilo de `prisma/seed/seed.ts` (script standalone com `new PrismaClient()`, sem depender do Nest DI):
   1. Buscar todas as linhas de `transformation_workshop_product` (`prisma.transformation_workshop_product.findMany()`).
   2. Descartar e logar (não interromper o script) linhas com `transformation_workshop_fk` ou `product_fk` nulos — o schema permite isso hoje (`transformation_workshop_fk Int?` e `product_fk Int?`, `prisma/schema.prisma:116` e `:118`), mas `inventory` exige ambos os campos não-nulos (`prisma/schema.prisma:327,329`).
   3. Agrupar as linhas restantes por `` `${transformation_workshop_fk}:${product_fk}` `` e somar `quantity` de cada grupo — necessário porque `transformation_workshop_product` **não tem** `@@unique([transformation_workshop_fk, product_fk])` (confirmado em `prisma/schema.prisma:110-119`, só existe `id` como chave), então duplicatas são possíveis mesmo com a checagem de `findFirst` feita em `addProductTransformationWorkshop` (linha 32-39) — essa checagem é só de aplicação, não é uma constraint de banco.
   4. Para cada grupo com `count > 1`, gravar um registro de auditoria (seguir o padrão já usado em `seed.ts:67-74` de escrever um arquivo em disco quando algo precisa de revisão manual) em `prisma/scripts/backfill-inventory-duplicates-<timestamp>.json`, listando `transformation_workshop_fk`, `product_fk`, ids das linhas duplicadas e quantidade somada.
   5. Para cada grupo com quantidade somada `> 0` (grupos com soma `0` não precisam de linha em `inventory` — ausência de linha já equivale a estoque zero nas consultas futuras): verificar se já existe `inventory` para o par (`prisma.inventory.findUnique` pela chave composta `transformation_workshop_fk_product_fk`, igual ao padrão usado em `inventory.service.ts:143-159`). Se já existir (por exemplo, ambiente onde alguém já testou o módulo `inventory` manualmente), **não sobrescrever** — logar como conflito para revisão manual em vez de somar ou substituir silenciosamente.
   6. Se não existir, criar em uma única `prisma.$transaction`: `inventory.create({ data: { transformation_workshop_fk, product_fk, quantity: quantidadeSomada } })` **e** `inventory_entry.create({ data: { transformation_workshop_fk, product_fk, quantity: quantidadeSomada } })` — grava o saldo e o lançamento de auditoria correspondente em uma única operação atômica (evita o vai-e-volta de três chamadas que `InventoryService.create`/`add_entry` fazem, que não é necessário aqui pois não há necessidade de passar por HTTP).
   7. Tornar o script idempotente (pode ser rodado mais de uma vez sem duplicar dados) graças à checagem do passo 5.
   8. Adicionar o script ao `package.json` (`"migrate:inventory-backfill"`) para que fique documentado e reproduzível em outros ambientes (staging, produção), em vez de rodado apenas localmente.

2. **`src/shipping/shipping.service.ts`** — em `calculate()`:
   - Linhas 29-33: trocar `this.prisma.transformation_workshop_product.findMany({ where: { product_fk: product?.id }, include: { transformation_workshop: true } })` por `this.prisma.inventory.findMany({ where: { product_fk: product?.id }, include: { transformation_workshop: true } })`. Os nomes de campo (`quantity`, `transformation_workshop_fk`, relação `transformation_workshop`) são idênticos entre os dois models, então o restante do método (linhas 50-65, que usa `p.quantity` e `p.transformation_workshop_fk`) não precisa mudar de shape — só o nome do model na query.
   - Conferir que `reservationsMap` (linhas 35-48, baseado em `stock_reservation`) continua correto sem alteração — ele já é independente de `transformation_workshop_product`.

3. **`src/orders/orders.service.ts`** — em `create()`:
   - Linhas 40-52: trocar a query de `transformation_workshop_product.findMany` por `inventory.findMany` (mesmo `where` com `transformation_workshop_fk: { in: workshops }` e `product_fk: { in: ... } }`); ajustar a chave do `Map` (linha 47-52) que hoje é `` `${wp.transformation_workshop_fk}-${wp.product_fk}` `` — continua igual, pois `inventory` tem os mesmos dois campos.
   - Linha 133 (`availableQuantity`): sem mudança de lógica, só troca o nome da variável/tipo de origem (`twProduct` → algo como `inventoryRow`).
   - Linhas 135-140 (erro "Estoque insuficiente"): manter a mensagem e o `HttpException` como estão — este é o comportamento correto e esperado *dentro do escopo desta tarefa* (onda 2/encomenda é TASK-04).
   - Linhas 174-179 (decremento ao confirmar o pedido): **atenção especial aqui**. Hoje o decremento roda dentro da transação Prisma aberta na linha 90 (`this.prisma.$transaction(async (tx) => {...})`), usando `tx.transformation_workshop_product.update(...)`. `InventoryService` (`src/inventory/shared/inventory.service.ts`) **não aceita um client transacional** — todos os seus métodos (`update`, linha 161; `add_exit`, linha 70) usam `this.prisma` diretamente (a instância singleton do `PrismaService`), não o `tx` passado por quem chama. Chamar `this.inventoryService.add_exit(...)` de dentro do `$transaction` de `orders.service.ts` executaria a escrita **fora** da transação do pedido, quebrando a atomicidade (se o pedido falhar depois e der rollback, o estoque já teria sido debitado). Para esta tarefa, **não reaproveitar `InventoryService`** neste ponto — inlinear a escrita usando o próprio `tx`:
     ```ts
     await tx.inventory.update({
       where: {
         transformation_workshop_fk_product_fk: {
           transformation_workshop_fk: workshopId,
           product_fk: item.product.connect.id,
         },
       },
       data: { quantity: { decrement: item.quantity } },
     });
     await tx.inventory_exit.create({
       data: {
         transformation_workshop_fk: workshopId,
         product_fk: item.product.connect.id,
         quantity: item.quantity,
       },
     });
     ```
     Gravar também o `inventory_exit` é importante: sem ele, `inventory.quantity` volta a ser um contador simples sem lastro, perdendo o propósito de "ledger" citado na decisão de produto nº 9 do plano.
   - Deixar um comentário no código apontando que o mesmo problema (métodos de serviço que não aceitam `tx`) deve ser revisto na TASK-05, já que `checkout.service.ts` terá uma necessidade parecida ao criar `production_reservation`.

4. **`src/checkout/checkout.service.ts`** — em `reserveStock()` (método já roda inteiro dentro de `this.prisma.$transaction(async (tx) => {...})`, linha 117):
   - Antes da leitura de disponibilidade, travar a linha correspondente: `await tx.$queryRaw`SELECT quantity FROM inventory WHERE transformation_workshop_fk = ${item.workshopId} AND product_fk = ${productId} FOR UPDATE`;` (template tag do Prisma, já parametrizado com segurança — não usar `$queryRawUnsafe`).
   - Linha 131: trocar `tx.transformation_workshop_product.findFirst({ where: { transformation_workshop_fk: item.workshopId, product_fk: productId } })` por `tx.inventory.findUnique({ where: { transformation_workshop_fk_product_fk: { transformation_workshop_fk: item.workshopId, product_fk: productId } } })`.
   - Linhas 147-152 (cálculo de `reservedQuantity`/`availableQuantity` e o `throw` de estoque insuficiente): mantêm a mesma lógica, agora executada com a linha já travada pelo `FOR UPDATE` — duas chamadas concorrentes para o mesmo par não conseguem mais ambas passar pela checagem antes de qualquer `create` commitar.
   - Trocar o `throw new Error(...)` atual (linha 151) por `HttpException(..., HttpStatus.BAD_REQUEST)`, consistente com o restante da API.
   - Aumentar `maxWait`/`timeout` da `$transaction` (defaults do Prisma são baixos) para acomodar a espera eventual pelo lock sob concorrência real.

5. **`src/bff/product_bff/shared/product_bff.service.ts`** — nos três métodos (`OnlyQuantProducts` linhas 13-43, `QuantProductsUid` linhas 45-83, `QuantProducts` linhas 85-115), trocar `this.prisma.transformation_workshop_product.findMany({ where: { product_fk: product.id } })` por `this.prisma.inventory.findMany({ where: { product_fk: product.id } })` — o restante (`.map(item => item.quantity).reduce(...)` e o `_sum` de `stock_reservation`) não muda. Os três métodos são quase idênticos; como nota opcional (não obrigatória para fechar esta tarefa), considerar extrair um método privado único `getAvailableQuantity(productId: number)` para eliminar a triplicação — só fazer se não atrasar a entrega, já que o foco desta tarefa é a migração da fonte de dados, não refatoração.

6. **`src/bff/transformation_workshop_product_bff/shared/transformation_workshop_bff.service.ts`**:
   - `addProductTransformationWorkshop` (linhas 28-65): manter a criação da linha em `transformation_workshop_product` (ela continua sendo o catálogo "quem produz/vende o quê", ainda usado por `transformationWorkshopProduct(twId)` nas linhas 10-26 para listar produtos de uma OT na tela de admin) mas gravar `quantity: 0` fixo em vez de `addProductTransformationWorkshopDto.quantity` (linha 57) — o valor enviado pelo admin deixa de virar estoque. Logo depois, dentro de um `prisma.$transaction`, criar também:
     - `inventory.create({ data: { transformation_workshop_fk: tw_fk, product_fk, quantity: 0 } })`;
     - `production_capacity.create({ data: { transformation_workshop_fk: tw_fk, product_fk, monthly_capacity: 0, active: false } })` (nomes de campo a confirmar contra o schema final entregue pela TASK-01; ver risco correspondente abaixo).
   - `updateTransformationWorkshop` (linhas 67-100): remover a escrita de `quantity` (linha 92) em `transformation_workshop_product.update`. Como `ProductTransformationWorkshopUpdateDto` (`transformation_workshop_product_update.dto.ts`) só tem o campo `quantity` hoje, decidir explicitamente o comportamento do endpoint após a mudança — recomendação: lançar `HttpException('Atualização de quantidade por esta rota foi descontinuada; utilize os endpoints de /inventory', HttpStatus.GONE)` em vez de deixar o endpoint aceitar a chamada e não fazer nada (silencioso demais). **Atenção**: `br.thp.zr0` (frontend) tem uma tela de admin que provavelmente chama esta rota — coordenar com quem cuidar do lado frontend antes de travar o endpoint, para não quebrar a tela sem aviso (ver "Riscos").

7. **`prisma/schema.prisma`** — adicionar comentário de depreciação acima do campo `quantity` do model `transformation_workshop_product` (linha 114), por exemplo:
   ```prisma
   /// @deprecated Nao escrever mais neste campo; fonte de verdade do estoque agora e `inventory`.
   /// Ver docs/feature/compra-por-encomenda/historia-tecnica.md
   quantity                   Int
   ```
   Isso não muda o schema funcionalmente (não requer nova migration), mas documenta a decisão diretamente onde qualquer desenvolvedor futuro vai olhar primeiro.

8. **Specs existentes** (`shipping.service.spec.ts`, `checkout.service.spec.ts`, `orders.service.spec.ts`): hoje são stubs gerados pelo `nest generate` (`Test.createTestingModule({ providers: [XxxService] })`, sem prover `PrismaService` nem as demais dependências) — não cobrem a lógica de estoque de verdade. Ao alterar os três serviços, garantir que os testes continuam compilando (`npm run test`) e, se o tempo permitir, aproveitar para escrever o primeiro teste real de cada um, mockando `PrismaService` com `prisma.inventory.findMany`/`findUnique` no lugar de `prisma.transformation_workshop_product`.

## Critérios de aceite

- Nenhum arquivo de produção (`src/**`) chama `prisma.transformation_workshop_product` para **ler ou escrever quantidade de estoque**; a única leitura remanescente de `transformation_workshop_product` é a listagem de catálogo em `transformationWorkshopProduct(twId)` (`transformation_workshop_bff.service.ts:10-26`).
- `POST /shipping/simulate` (ou, enquanto a TASK-04 não existe, o `calculate()` atual de `shipping.service.ts`) reflete corretamente a soma de `inventory.quantity` menos `stock_reservation` ativas por OT.
- Criar uma nova associação produto+OT (`addProductTransformationWorkshop`) gera, no mesmo commit/transação: 1 linha em `transformation_workshop_product` (quantity 0), 1 linha em `inventory` (quantity 0) e 1 linha em `production_capacity` (active false).
- `updateTransformationWorkshop` não altera mais `transformation_workshop_product.quantity` em nenhuma circunstância.
- Fechar um pedido (`OrdersService.create`) debita `inventory.quantity` e cria a linha correspondente em `inventory_exit`, dentro da mesma transação Prisma que cria `order`/`order_service`/`order_item` (sem escrita fora do `tx`).
- Rodar o script de backfill duas vezes seguidas no mesmo banco não duplica quantidade em `inventory` (idempotente).
- Duas chamadas concorrentes de `reserveStock` para o mesmo par `(workshop, produto)`, cuja soma excede `inventory.quantity` disponível, resultam em exatamente uma reserva aceita (validado por teste de concorrência) — prova de que o `SELECT ... FOR UPDATE` está funcionando.
- Todo par duplicado encontrado em `transformation_workshop_product` durante o backfill é reportado em um arquivo de log, não descartado silenciosamente.
- `npm run build` e `npm run lint` passam sem novos erros nos arquivos alterados.
- `npm run test` passa (specs existentes continuam compilando após a troca de model).

## Validação

1. Rodar `npm run migrate:inventory-backfill` (novo script) contra um banco de desenvolvimento com dados de `transformation_workshop_product` variados (incluindo ao menos um par duplicado forçado manualmente) e conferir:
   - `inventory` ficou com a soma correta por par.
   - O arquivo de log de duplicatas foi gerado e lista o par forçado.
   - Rodar o script de novo e confirmar que nada muda na segunda execução (idempotência).
2. Recriar o cenário motivador do plano (produto com estoque somado 20 entre 2 OTs) e chamar o `calculate()` de `shipping.service.ts` (ou o endpoint HTTP correspondente) para confirmar que o resultado bate com o que batia antes da migração (mesmo resultado, fonte de dados diferente).
3. Chamar `POST /checkout/reserve` (endpoint atual de `reserveStock`) duas vezes para o mesmo par (workshop, produto) e confirmar que a segunda reserva respeita o saldo já reservado pela primeira (mesma regra de hoje, agora lendo `inventory`).
4. Fechar um pedido completo via `POST /orders` e conferir no banco: `inventory.quantity` diminuiu exatamente a quantidade do pedido, existe uma linha nova em `inventory_exit` com a mesma quantidade, e `transformation_workshop_product.quantity` do par **não mudou** (prova de que o campo está congelado).
5. Chamar `addProductTransformationWorkshop` com um par novo e conferir as três linhas criadas (`transformation_workshop_product`, `inventory`, `production_capacity`).
6. Chamar `updateTransformationWorkshop` e confirmar que `transformation_workshop_product.quantity` não é alterado (e que o comportamento novo do endpoint — erro explícito ou no-op, conforme decidido no passo 6 da implementação — está documentado).
7. Executar `npm run lint` e `npm run build` nos arquivos alterados.
8. Executar `npm run test` (specs de `shipping`, `checkout`, `orders`) e confirmar ausência de novas falhas.
9. Rodar novamente a suíte de e2e existente, se houver cobertura de `orders`/`checkout` em `test/`, para garantir que a troca de model não quebrou nenhum fluxo coberto.

## Riscos

- **Transação partida em `orders.service.ts`**: se o decremento de `inventory` for feito chamando `InventoryService` (que usa `this.prisma`, não o `tx` da transação do pedido) em vez de inlinear com `tx.inventory.update`, o débito de estoque escapa da atomicidade do pedido — risco de estoque sair errado se o pedido falhar depois do débito.
- **Duplicatas em `transformation_workshop_product`**: como não há `@@unique([transformation_workshop_fk, product_fk])` nessa tabela, o backfill pode encontrar pares duplicados com quantidades divergentes; somar sem revisão pode mascarar um erro de dados pré-existente (ex.: duas linhas manuais conflitantes de estoque real).
- **Depender do schema exato de `production_capacity` (TASK-01)**: os nomes de campo usados no passo 6 (`monthly_capacity`, `active`) são os descritos no plano, mas a implementação final da TASK-01 pode diferir ligeiramente (tipos, nome exato); se TASK-01 mudar isso, o código desta tarefa quebra em tempo de compilação Prisma.
- **Endpoint `updateTransformationWorkshop` sem uso claro após remover `quantity`**: o frontend (`br.thp.zr0`) provavelmente tem uma tela de admin que chama essa rota esperando atualizar estoque; travar o endpoint sem avisar quebra essa tela silenciosamente em produção.
- **Ambientes onde `inventory` já foi usado manualmente para testes**: o backfill pode encontrar uma linha de `inventory` já existente para um par que também existe em `transformation_workshop_product`, criando ambiguidade sobre qual valor é o correto.
- **Specs atuais não cobrem a lógica de estoque**: como `shipping.service.spec.ts`, `checkout.service.spec.ts` e `orders.service.spec.ts` são stubs sem mocks reais, um erro de shape (ex.: esquecer que `inventory` não tem campo `id` simples, só chave composta) pode passar despercebido pelos testes automatizados e só aparecer em teste manual.

## Mitigação

- Inlinear a escrita de `inventory`/`inventory_exit` usando o `tx` já disponível em `orders.service.ts` (não reaproveitar `InventoryService` nesse ponto específico); registrar um comentário no código e mencionar explicitamente na TASK-05 que os métodos de `InventoryService` precisarão aceitar um client transacional opcional se forem reaproveitados em outros pontos.
- Nunca somar duplicatas de `transformation_workshop_product` sem gerar o arquivo de log correspondente; tratar qualquer duplicata como candidata a revisão manual antes de fechar esta tarefa em produção (rodar primeiro em ambiente de homologação).
- Validar o nome exato dos campos de `production_capacity` contra o `prisma/schema.prisma` já mesclado da TASK-01 antes de escrever o código do passo 6 (não assumir apenas pelo texto do plano).
- Antes de travar `updateTransformationWorkshop`, abrir uma conversa/ticket com quem for tocar as tarefas de frontend (`br.thp.zr0/docs/feature/compra-por-encomenda/tasks/`) para confirmar se a tela de admin já pode ser ajustada em paralelo, ou se é preferível manter o endpoint como no-op temporário com aviso no corpo da resposta em vez de erro 410.
- No backfill, tratar "já existe `inventory` para o par" como bloqueio explícito (log + skip), nunca sobrescrita automática.
- Aproveitar a própria migração para escrever o primeiro teste real de cada um dos três serviços tocados, mockando `prisma.inventory` — mesmo que não seja cobertura completa, elimina o risco de regressão silenciosa de shape citado acima.