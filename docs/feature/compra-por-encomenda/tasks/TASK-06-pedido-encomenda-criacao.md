# TASK-06 - Criação do Pedido de Encomenda

## Metadados

- **Prioridade:** P0
- **Status:** Não iniciada
- **Dependências:** TASK-05 (Checkout do Pedido de Encomenda com lock de concorrência)
- **Bloqueia:** TASK-09 (Testes e validação end-to-end)

> **Nota de escopo:** a versão anterior desta tarefa alterava `OrdersService.create()` (`src/orders/orders.service.ts`) para agrupar por `workshop:saleType` e criar remessas mistas dentro de um único pedido. Isso foi descartado: `orders.service.ts` **não é tocado por esta tarefa** — continua servindo exclusivamente o Pedido de Pronta Entrega, sem nenhuma mudança de agrupamento (TASK-02 já cobre os ajustes necessários ali). A criação do Pedido de Encomenda ganha um método próprio, `POST /production-order`, inteiramente dentro do módulo novo criado na TASK-04.

## Objetivo

Implementar `POST /production-order`, que confirma o Pedido de Encomenda: cria um `order` com `sale_type = ENCOMENDA` e `simulation_mode` preenchidos, um `order_service` por OT envolvida (sem necessidade de diferenciar tipo por remessa, já que o pedido inteiro é homogêneo), e uma linha `production` por fatia (`production_status = QUEUED`, `order_item_fk` preenchido), consumindo a `production_reservation` correspondente criada na TASK-05 — no mesmo padrão já usado por `orders.service.ts` para vincular `stock_reservation` ao pedido (`order_fk`), mas de forma totalmente independente.

## Escopo

- Criar `CreateProductionOrderDto` (`userId`, `productId`, `simulationMode`, `shipments: { workshopId, quantity }[]`, endereço de entrega, forma de pagamento — mesmo shape conceitual de `CreateOrderDto`, mas em módulo próprio).
- Implementar `ProductionOrderService.create(dto)`, dentro de `$transaction`:
  - Revalidar que a `production_reservation` de cada fatia ainda está ativa (`expires_at > now`, `order_fk = null`) — nunca confiar apenas no payload do cliente.
  - Criar `order` com `sale_type = ENCOMENDA`, `simulation_mode`, `payment_method`, endereço de entrega.
  - Criar um `order_service` por OT (`status = PENDING`, `estimated_ready_at`/`estimated_delivery_at` vindos da reserva).
  - Criar `order_item` por fatia (sem `sale_type` — herdado do `order` pai).
  - Criar `production` por fatia (`production_status = QUEUED`, `order_item_fk` preenchido, `date_start`/`date_end` vindos de `production_reservation.estimated_ready_at`, **sem recalcular** `finishDateFor` — só materializa o que já foi reservado).
  - Vincular as `production_reservation` consumidas ao pedido (`order_fk = order.id`), mesmo padrão do `updateMany` já usado para `stock_reservation` em `orders.service.ts:218-225`.
- Ajustar a transição de status por confirmação de pagamento (`payment.service.ts`) para que `order_service` de um pedido `ENCOMENDA` vá para `IN_PRODUCTION` (não `CONFIRMED`) ao ser pago — ramificando por `order.sale_type`, já que não há mais `sale_type` por `order_service`.
- **Fora de escopo:** qualquer alteração em `orders.service.ts`/`OrderStatus` de Pronta Entrega; migração de estoque (TASK-02); algoritmo de simulação (TASK-04); reserva/lock (TASK-05); cron de limpeza (TASK-08).

## Arquivos previstos

- `src/production-order/production-order.controller.ts` — novo endpoint `POST /production-order`.
- `src/production-order/shared/production-order.service.ts` — método `create(dto)`.
- `src/production-order/dto/create-production-order.dto.ts` (novo).
- `src/payment/payment.service.ts` — `updateOrderStatus` (linhas 238-244 no fluxo atual): ramificar por `order.sale_type` em vez de aplicar `CONFIRMED` incondicionalmente a todos os `order_service`.
- `src/production-order/shared/production-order.service.spec.ts` — expandido.
- Leitura, sem alterar (referência de padrão): `src/orders/orders.service.ts` (linhas 90-225, estrutura de transação e vínculo de reserva ao pedido).

## Passos de implementação

1. Confirmar no schema (TASK-01) que `order.sale_type`/`simulation_mode`, `order_service.estimated_ready_at`/`estimated_delivery_at` e `production.production_status`/`order_item_fk` já existem e que o Prisma Client foi regenerado.
2. Criar `CreateProductionOrderDto` com `class-validator`, no mesmo padrão de `src/orders/dto/create-order.dto.ts`, mas em `src/production-order/dto/`.
3. Implementar `create(dto)` em `ProductionOrderService`, dentro de `this.prisma.$transaction(async (tx) => {...})`:
   - Para cada fatia de `dto.shipments`, buscar a `production_reservation` ativa do usuário para `(workshopId, productId)` com quantidade compatível; se não encontrar (expirada ou divergente), `throw new HttpException('Reserva de produção não encontrada ou expirada', HttpStatus.BAD_REQUEST)` — nenhum registro parcial é criado (tudo dentro da mesma `tx`).
   - `tx.order.create({ data: { sale_type: 'ENCOMENDA', simulation_mode: dto.simulationMode, user: {connect}, payment_method: dto.paymentMethod, ... } })`.
   - Para cada OT distinta entre as fatias: `tx.order_service.create({ data: { transformation_workshop: {connect}, order: {connect}, status: 'PENDING', estimated_ready_at, estimated_delivery_at, order_item: { create: [...] } } })`.
   - Para cada `order_item` criado, `tx.production.create({ data: { product: {connect}, transformation_workshop: {connect}, quantity, production_status: 'QUEUED', order_item: {connect}, date_start: now, date_end: reservation.estimated_ready_at } })`.
   - `tx.production_reservation.updateMany({ where: { user_fk: dto.userId, expires_at: { gt: new Date() }, order_fk: null }, data: { order_fk: order.id } })`.
4. Ajustar `payment.service.ts` (`updateOrderStatus`): ao processar `payment_status = PAID`, buscar `order.sale_type`; se `ENCOMENDA`, atualizar todos os `order_service` do pedido para `IN_PRODUCTION` (enum já existente em `OrderStatus`, hoje nunca usado); se `PRONTA_ENTREGA`, manter o comportamento atual (`CONFIRMED`).
5. Adicionar `POST /production-order` em `ProductionOrderController`.
6. Rodar manualmente o cenário motivador (encomenda de 30 unidades, OT A + OT B) de ponta a ponta: `POST /production-order/simulate` → `POST /production-order/reserve` → `POST /production-order`, inspecionando `order` (`sale_type=ENCOMENDA`), `order_service`, `order_item`, `production` e `production_reservation` gerados.
7. Escrever/expandir testes unitários cobrindo: pedido de encomenda com 1 OT, pedido com 2+ OTs (modo prazo particionado), reserva de produção ausente/expirada (falha controlada, sem registro parcial), transição de status para `IN_PRODUCTION` ao confirmar pagamento.
8. Rodar lint e build do projeto.

## Critérios de aceite

- `order` criado por este fluxo sempre tem `sale_type = ENCOMENDA` e `simulation_mode` preenchidos.
- Um `order_service` é criado por OT envolvida na encomenda (nunca mais de um por OT dentro do mesmo pedido, já que o pedido é homogêneo).
- `order_service.estimated_ready_at`/`estimated_delivery_at` sempre preenchidos (nunca nulos) para pedidos de Encomenda.
- Cada `order_item` gera exatamente 1 registro em `production`, com `order_item_fk` preenchido e `production_status = QUEUED`.
- `production_reservation` usadas no pedido ficam com `order_fk` preenchido ao final da transação.
- Pedido cuja `production_reservation` correspondente não existe ou expirou falha com HTTP 400, sem criar nenhum registro parcial.
- Após confirmação de pagamento, `order_service` de um pedido `ENCOMENDA` vai para `IN_PRODUCTION` (nunca `CONFIRMED`).
- `orders.service.ts` permanece sem nenhuma alteração relacionada a esta tarefa.

## Validação

- Testes unitários com `PrismaService`/`$transaction` mockados cobrindo os cenários do passo 7.
- Teste manual do fluxo completo: `POST /production-order/simulate` → `POST /production-order/reserve` → `POST /production-order`, conferindo os registros gerados no banco.
- Simular reserva expirada no meio do fluxo (deixar o TTL vencer entre `reserve` e `create`) e confirmar falha clara.
- Rodar a suíte de testes existente de `orders`/`payment` para garantir ausência de regressão no fluxo de Pronta Entrega (que não foi tocado).
- Rodar lint e build do projeto.

## Riscos

- Duplicar validação de disponibilidade já feita no checkout (TASK-05) pode divergir do estado real se a reserva expirar exatamente entre `reserve` e `create` (janela de concorrência) — mitigado por revalidar `expires_at` dentro da própria `tx`.
- `production.date_end` vindo direto de `production_reservation.estimated_ready_at` (sem recálculo) depende de que a TASK-05 tenha congelado esse valor corretamente no momento da reserva.
- Ajustar `payment.service.ts` para ramificar por `order.sale_type` exige atenção para não regredir o caminho de Pronta Entrega (`CONFIRMED`).

## Mitigação

- Revalidar `production_reservation.expires_at > now()` dentro da própria `tx` imediatamente antes de consumi-la, falhando com mensagem clara se expirou.
- Cobrir com teste unitário explícito o caminho de Pronta Entrega em `payment.service.ts` (regressão), além do novo caminho de Encomenda.
- Não implementar lock adicional nesta task além do que a TASK-05 já fornece — aqui, mitigar apenas revalidando a reserva antes de consumi-la.
