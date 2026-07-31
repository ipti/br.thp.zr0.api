# TASK-09 - Testes e validação end-to-end dos dois fluxos

## Metadados

- **Prioridade:** P0
- **Status:** Não iniciada
- **Dependências:** TASK-01 a TASK-08
- **Bloqueia:** Nenhuma

> **Nota de escopo:** a versão anterior desta tarefa validava um único fluxo combinado (`POST /shipping/simulate` → `POST /checkout/reserve` → `POST /orders`) que misturava pronta entrega e encomenda no mesmo pedido. Isso foi descartado: agora existem **dois fluxos completamente independentes** a validar separadamente — Pronta Entrega (inalterado estruturalmente, só migrado para `inventory`) e Encomenda (`POST /production-order/simulate` → `/reserve` → `POST /production-order`, novo módulo). Um dos critérios centrais desta tarefa passa a ser justamente confirmar que **os dois fluxos nunca se misturam**.

## Objetivo

Validar de ponta a ponta, com evidências reproduzíveis, que as oito tarefas anteriores compõem, juntas, o comportamento descrito em `historia-funcional.md`: uma escola que pede 50 unidades de um produto com 20 em estoque agregado deve poder (a) comprar as 20 disponíveis como Pedido de Pronta Entrega, e (b), separadamente, abrir um Pedido de Encomenda pela quantidade que desejar (30, 50, ou qualquer outra), com as duas simulações completas (custo e prazo) e fatiamento entre as OTs com capacidade ativa (OT A 35/mês, OT B 15/mês) — sem que os dois pedidos jamais se combinem, e sem regressão no comportamento hoje existente do fluxo de Pronta Entrega.

Esta tarefa não implementa lógica de negócio nova — ela constrói a suíte de testes (unitária, integração e e2e) e o roteiro de verificação manual que prova que o que foi implementado nas TASK-01 a TASK-08 está correto, funcionando como o portão de qualidade (release gate) da feature.

## Escopo

### Dentro do escopo

- Testes unitários (Jest) para os serviços novos e alterados pela feature, nos dois módulos (`checkout`/`orders` para Pronta Entrega; `production-order` para Encomenda).
- Um teste de integração/e2e (`test/*.e2e-spec.ts`) reproduzindo o fluxo de Pronta Entrega isolado (compra limitada a 20 unidades).
- Um teste de integração/e2e reproduzindo o fluxo de Encomenda isolado, do zero até a confirmação, nos dois modos (custo e prazo).
- Um teste explícito confirmando que **nenhuma tela/endpoint combina os dois fluxos** — ex.: `POST /orders` (Pronta Entrega) não aceita `simulationMode`/campos de encomenda; `POST /production-order` não aceita nem consulta `inventory`.
- Um teste dedicado de concorrência para os dois locks (TASK-02: `inventory`/`stock_reservation`; TASK-05: `production_capacity`/`production_reservation`), executados e validados de forma independente.
- Um teste de regressão do fluxo de Pronta Entrega puro, confirmando que a migração para `inventory` (TASK-02) não alterou nenhum comportamento observável.
- Verificação (unitária + manual) de que `MeuEnvioShippingStrategy.calculatePrice()` deixou de usar dimensões fixas nos dois fluxos.
- Roteiro de verificação manual dos e-mails e da tela de pedidos da OT, agora exibindo pedidos de Pronta Entrega e de Encomenda como registros claramente distintos (não mais remessas misturadas dentro do mesmo pedido).
- Configuração da infraestrutura de teste que falta hoje (banco de teste dedicado, `globalSetup`/`globalTeardown`).
- Coleta e organização das evidências.

### Fora do escopo

- Qualquer correção de bug ou implementação de lógica nova — reportar/reabrir na TASK correspondente (01 a 08).
- Testes de carga/performance além de um smoke test razoável.
- Testes de frontend — pertencem às tasks do repositório `br.thp.zr0`.
- Recalcular pedidos já confirmados quando `production_capacity.monthly_capacity` muda depois.

## Arquivos previstos

**Testes unitários:**
- `src/shipping/shipping.service.spec.ts` — expandir (fluxo de Pronta Entrega, migrado para `inventory`).
- `src/shipping/strategies/meu-envio-shipping.strategy.spec.ts` — novo; dimensões reais + `delivery_time`.
- `src/production/shared/production-queue.service.spec.ts` — novo (TASK-03).
- `src/production-capacity/production-capacity.service.spec.ts` — novo (TASK-03).
- `src/production-order/shared/production-order.service.spec.ts` — expandir (TASK-04/05/06: simulação, reserva, criação).
- `src/production-order/production-order.controller.spec.ts` — expandir.
- `src/checkout/checkout.service.spec.ts` — expandir (lock de `inventory`, TASK-02).
- `src/orders/orders.service.spec.ts` — expandir, **confirmando que o agrupamento permanece só por `workshopId`** (sem alteração de chave, diferente da versão anterior deste desenho).
- `src/scheduler/reservation-cleanup.scheduler.spec.ts` — novo (TASK-08).

**Teste de integração/e2e (novo):**
- `test/pronta-entrega.e2e-spec.ts` — fluxo de Pronta Entrega isolado.
- `test/encomenda-escola.e2e-spec.ts` — fluxo de Encomenda isolado, cenário da escola.
- `test/fluxos-nao-se-misturam.e2e-spec.ts` — confirma isolamento entre os dois módulos/contratos.
- `test/setup-e2e.ts`, `test/jest-e2e.json`, `.env.test` — infraestrutura de teste (hoje inexistente).

**Fixtures/seed:**
- `prisma/seed/seed-encomenda-escola.ts` (novo) — produto, 2+ OTs, `inventory` somando 20 unidades, `production_capacity` ativa (OT A 35/mês, OT B 15/mês), usuário de teste.

## Passos de implementação

1. **Preparar a infraestrutura de teste** (banco de teste dedicado, `.env.test`, `globalSetup`/`globalTeardown` no Jest e2e) — mesma necessidade da versão anterior deste desenho, inalterada pela revisão de arquitetura.

2. **Construir a fixture do cenário da escola**: 1 produto, OT A (`inventory.quantity = 14`, `production_capacity.monthly_capacity = 35`, `active = true`), OT B (`inventory.quantity = 6`, `production_capacity.monthly_capacity = 15`, `active = true`) — soma de estoque pronto = 20. 1 usuário de teste autenticável.

3. **Testes unitários do fluxo de Pronta Entrega** (`shipping.service.ts`/`checkout.service.ts`/`orders.service.ts`, migrados para `inventory` na TASK-02):
   - Estoque cobre 100% do pedido.
   - Estoque cobre só parte do pedido (20 de 50) — o pedido deve ser limitado/rejeitado para a quantidade excedente, **sem nenhum fallback ou sugestão automática de produção dentro deste mesmo fluxo**.
   - Teste de concorrência: duas reservas simultâneas do mesmo par (workshop, produto) via `SELECT ... FOR UPDATE` (TASK-02) — nunca overselling.
   - Confirmar que `orders.service.ts` **não** foi alterado para agrupar por `workshop:saleType` — o agrupamento continua só por `workshopId` (diferente da versão anterior deste desenho).

4. **Testes unitários do fluxo de Encomenda** (`production-order.service.ts`, TASK-03/04/05/06):
   - `finishDateFor(workshopId, productId, qty) = queueTail + qty * 30 / monthly_capacity`, incluindo pedido maior que 1 mês de capacidade de uma única OT.
   - `getQueueTail` com `production.date_end = null` (registro legado) — ignorado no `MAX()`, logado, sem quebrar a simulação.
   - Modo custo (atribui à OT ativa de frete mais barato) e modo prazo (fatiamento incremental por chunks) com os números do cenário — confirmar que os dois modos podem divergir.
   - Simulação de encomenda **nunca consulta `inventory`/`stock_reservation`** — teste explícito de que nenhum mock de `inventory` é acessado durante `simulate()`.
   - Produto sem nenhuma OT com `production_capacity.active = true` → `{ unavailable: true }`, nunca exceção genérica nem quantidade "desaparecida".
   - Teste de concorrência: duas reservas simultâneas do mesmo par via lock em `production_capacity` (TASK-05).
   - Criação do pedido (`POST /production-order`): `order.sale_type = ENCOMENDA`, `order_service` por OT com datas estimadas, `production` com `order_item_fk`/`production_status = QUEUED`, `production_reservation` vinculada ao pedido.

5. **Teste explícito de isolamento entre os dois fluxos** (`test/fluxos-nao-se-misturam.e2e-spec.ts`):
   - `POST /orders` (Pronta Entrega) rejeita/ignora qualquer campo relacionado a `simulationMode`/encomenda no payload.
   - `POST /production-order` não possui nenhum parâmetro de `workshopId` vindo de estoque nem consulta `inventory` em nenhum ponto (confirmar via mock estrito, falhando o teste se `prisma.inventory.*` for chamado).
   - Nenhuma tela/endpoint retorna, na mesma resposta, itens de Pronta Entrega e de Encomenda combinados.

6. **Teste do bug de dimensões de frete** (`meu-envio-shipping.strategy.spec.ts`) — payload usa `product.width/height/length/weight` reais, aplicável aos dois fluxos.

7. **Teste de regressão do fluxo de Pronta Entrega puro** — comportamento observável idêntico ao pré-feature (estrutura de `order_service`, e-mail, débito de estoque), exceto pela fonte de dado (`inventory` em vez de `transformation_workshop_product`).

8. **Teste de integração/e2e do Pedido de Encomenda** (`test/encomenda-escola.e2e-spec.ts`):
   1. `POST /auth/login` → Bearer token.
   2. `POST /production-order/simulate` pedindo, por exemplo, 30 unidades → asserts: `costPlan`/`deadlinePlan` sempre presentes; fatiamento entre OT A/OT B conforme o modo; prazo detalhado por remessa (nunca uma data única); nenhuma consulta a `inventory`.
   3. `POST /production-order/reserve` com o plano escolhido → `production_reservation` criada com `estimated_ready_at` congelado.
   4. `POST /production-order` → `order.sale_type = ENCOMENDA`, `order_service`/`order_item`/`production` corretos, `production_reservation.order_fk` preenchido.
   5. Repetir pedindo 50 unidades (a quantidade cheia que a escola queria originalmente) para confirmar que a jornada de encomenda não depende de "quanto faltou" da pronta entrega.

9. **Teste de integração/e2e do Pedido de Pronta Entrega** (`test/pronta-entrega.e2e-spec.ts`):
   1. Pedido de 50 unidades → confirmar que o sistema limita/rejeita a quantidade acima do estoque disponível (20), sem nenhuma sugestão automática de encomenda dentro do mesmo fluxo.
   2. Pedido de 20 unidades (exatamente o disponível) → confirma corretamente como Pronta Entrega.

10. **Teste da tela de pedidos da OT e e-mails**: confirmar que um pedido de Pronta Entrega e um pedido de Encomenda (ambos do mesmo cliente/produto, mas pedidos distintos) aparecem como registros separados e corretamente identificados (`order.sale_type`) na listagem da OT e nos e-mails — não mais como remessas dentro de um único pedido.

11. **Teste do cron de limpeza** (TASK-08): reservas expiradas em `stock_reservation` e `production_reservation`, sem `order_fk`, são removidas pelas duas chamadas do scheduler, de forma independente.

12. **Rodar a suíte completa existente** (`npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e`) e confirmar ausência de regressão em suítes pré-existentes.

13. **Consolidar evidências e preencher o checklist de aceite.**

## Critérios de aceite

- O Pedido de Pronta Entrega, para o cenário da escola, fica limitado a 20 unidades — nenhuma sugestão ou fallback automático de produção dentro do mesmo pedido.
- O Pedido de Encomenda, para qualquer quantidade escolhida livremente pelo cliente (30, 50, etc.), retorna sempre `costPlan` e `deadlinePlan` completos, sem nunca consultar `inventory`.
- Os dois fluxos nunca se combinam em nenhuma tela, endpoint ou resposta — validado por teste explícito de isolamento.
- Testes de concorrência dos dois locks (TASK-02 e TASK-05) provam ausência de overselling, cada um em seu próprio recurso.
- `POST /production-order` gera `order.sale_type = ENCOMENDA`, `order_service`/`order_item`/`production` corretos; `orders.service.ts` permanece com agrupamento só por `workshopId`, sem `saleType` composto.
- Produto sem nenhuma OT com `production_capacity.active = true` retorna aviso explícito na jornada de Encomenda.
- O fluxo de Pronta Entrega puro permanece com comportamento observável idêntico ao pré-feature.
- `MeuEnvioShippingStrategy.calculatePrice()` usa dimensões reais nos dois fluxos.
- E-mails e tela de pedidos da OT distinguem corretamente pedidos de Pronta Entrega e de Encomenda como registros separados.
- O cron de limpeza remove reservas expiradas das duas tabelas, cada uma por sua própria chamada.
- `npm run lint`, `npm run build`, `npm run test` e `npm run test:e2e` passam sem novos erros.

## Validação

### Comandos e ordem de execução

1. `npx prisma migrate dev` — conferir tabelas/enums novos e backfill de `production_capacity`/`inventory`.
2. Script de fixture da escola.
3. `npm run lint`.
4. `npm run build`.
5. `npm run test`.
6. `npm run test:e2e` (inclui os três novos specs e2e).

### Matriz de cenários

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Pedido de Pronta Entrega de 50 unidades (20 disponíveis) | Limitado/rejeitado para o excedente, sem fallback para produção |
| 2 | Pedido de Encomenda de 30 unidades, modo custo | Atribuído à OT ativa de frete mais barato |
| 3 | Pedido de Encomenda de 30 unidades, modo prazo | Pode particionar entre OT A e OT B para reduzir o prazo máximo |
| 4 | Pedido de Encomenda de 50 unidades (quantidade cheia) | Tratado como produção nova, sem relação com o que foi comprado em Pronta Entrega |
| 5 | Isolamento entre fluxos | Nenhum endpoint/tela combina os dois tipos de pedido |
| 6 | Reserva concorrente (Pronta Entrega) | Lock em `inventory` impede overselling |
| 7 | Reserva concorrente (Encomenda) | Lock em `production_capacity` impede overselling |
| 8 | Produto sem `production_capacity` ativa | Jornada de Encomenda retorna aviso explícito |
| 9 | `production.date_end = null` legado | Ignorado no cálculo de fila, com log de alerta |
| 10 | Cron de limpeza | Reservas expiradas removidas nas duas tabelas |
| 11 | Frete com dimensões reais | Payload usa dimensões reais nos dois fluxos |
| 12 | Tela de pedidos da OT / e-mails | Pedidos de Pronta Entrega e Encomenda aparecem como registros distintos |

### Evidências obrigatórias

- Saída completa de `npx prisma migrate dev`, `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e`.
- Corpo de resposta de `POST /production-order/simulate` para 30 e 50 unidades, nos dois modos.
- Registros de banco de `production_reservation`, `stock_reservation`, `order`, `order_service`, `order_item`, `production` após os dois fluxos de teste.
- Checklist da matriz de cenários preenchido com PASS/FAIL.

## Riscos

- Infraestrutura de teste inexistente hoje (banco dedicado, `globalSetup`/`globalTeardown`) — esta tarefa parte quase do zero em cobertura automatizada.
- Testes de concorrência são inerentemente instáveis (timing entre transações).
- `production.date_end` nulo em registros manuais antigos pode já existir em ambientes reais.
- E-mail atual (`sendOrder.hbs`) pode não diferenciar visualmente Pronta Entrega de Encomenda como pedidos distintos — gap de produto a documentar, não a resolver nesta tarefa.

## Mitigação

- Tratar a infraestrutura de teste como primeiro passo bloqueante.
- Preferir race conditions determinísticas (mock/spy controlado) em vez de `Promise.all` puro com timing real.
- Documentar gaps de produto (ex.: e-mail sem diferenciação visual) separadamente das falhas técnicas.
- Rodar a suíte numa branch limpa (antes das TASK-01 a 08) como baseline de comparação.

## Critério de bloqueio (gate de publicação)

A feature de Compra por Encomenda não deve ser publicada se:

- O Pedido de Pronta Entrega e o Pedido de Encomenda puderem, em algum caminho, se combinar num único pedido.
- O cenário da escola (50 desejadas, 20 em estoque, OT A 35/mês, OT B 15/mês) não fechar corretamente em pelo menos um dos dois modos de simulação de Encomenda.
- A simulação de Encomenda "perder" quantidade silenciosamente (produto sem capacidade cadastrada sem aviso explícito).
- Qualquer teste de concorrência demonstrar overselling de estoque ou de capacidade de produção.
- O fluxo de Pronta Entrega puro (regressão) apresentar qualquer diferença de comportamento observável.
- `npm run lint`, `npm run build`, `npm run test` ou `npm run test:e2e` falharem com erros novos atribuíveis à feature.
