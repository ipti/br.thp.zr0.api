# TASK-05 - Checkout do Pedido de Encomenda com lock de concorrência

## Metadados

- **Prioridade:** P0
- **Status:** Não iniciada
- **Dependências:** TASK-04 (endpoint de simulação do Pedido de Encomenda)
- **Bloqueia:** TASK-06 (Criação do Pedido de Encomenda)

> **Nota de escopo:** a versão anterior desta tarefa evoluía `CheckoutService.reserveStock` (`src/checkout/checkout.service.ts`) para aceitar fatias mistas de estoque e produção. Isso foi descartado: a reserva de capacidade de produção vive inteiramente no **módulo novo `production-order`** (TASK-04), **sem tocar `checkout.service.ts`** — o lock de concorrência para `stock_reservation`/`inventory` (Pronta Entrega) é escopo da TASK-02, aplicado de forma independente.

## Objetivo

Implementar `POST /production-order/reserve`, que recebe o plano de simulação escolhido pelo cliente (`simulationMode` + `shipments[]`, saída de `POST /production-order/simulate`, TASK-04) e reserva temporariamente (TTL) a capacidade de produção correspondente em `production_reservation`, recalculando `estimated_ready_at` **dentro da transação** (nunca confiando no valor da simulação) e protegendo a operação com lock de concorrência explícito (`SELECT ... FOR UPDATE`) por par `(workshop, produto)` em `production_capacity` — corrigindo, para este fluxo, o mesmo padrão de bug (checagem sem lock) que a TASK-02 corrige independentemente para `stock_reservation`.

## Escopo

- Criar `ReserveProductionOrderDto` (`userId`, `productId`, `simulationMode`, `shipments: { workshopId, quantity }[]`).
- Implementar `ProductionOrderService.reserve(dto)`, dentro de `$transaction`:
  - Ordenar os pares `(workshopId, productId)` deterministicamente antes de qualquer leitura, para evitar deadlock entre chamadas concorrentes.
  - Para cada par, `SELECT ... FOR UPDATE` na linha de `production_capacity`, validar `active = true` (pode ter mudado desde a simulação — se `false`, abortar a transação inteira com erro explícito).
  - Recalcular `estimated_ready_at` via `ProductionQueueService.getQueueTail`/`finishDateFor` (TASK-03), **usando o client `tx` da transação corrente** (para enxergar reservas já criadas no mesmo loop, se o mesmo par aparecer mais de uma vez).
  - Criar uma `production_reservation` por fatia, com o mesmo TTL já usado por `stock_reservation` (`checkout.service.ts`, 15 minutos).
- Estender a limpeza de reservas expiradas para cobrir `production_reservation` (equivalente a `releaseExpiredReservations`, hoje só em `checkout.service.ts`).
- **Fora de escopo:** qualquer alteração em `stock_reservation`/`inventory`/`checkout.service.ts` (TASK-02, independente); consumo da reserva na criação definitiva do pedido (TASK-06); cron de limpeza automática (TASK-08).

## Arquivos previstos

- `src/production-order/production-order.controller.ts` — novo endpoint `POST /production-order/reserve`.
- `src/production-order/shared/production-order.service.ts` — método `reserve(dto)`.
- `src/production-order/dto/reserve-production-order.dto.ts` (novo).
- `src/production-order/entities/reservation.entity.ts` (novo) — `{ expiresAt: Date; reservations: { workshopId, quantity, productionReservationId, estimatedReadyAt }[] }`.
- `src/production/shared/production-queue.service.ts` — consumido (TASK-03); pode precisar de ajuste para aceitar um client de transação (`tx`) como parâmetro opcional, se ainda não aceitar.
- `src/production-order/shared/production-order.service.spec.ts` — expandido com os testes desta tarefa.

## Passos de implementação

1. Confirmar que `ProductionQueueService.getQueueTail`/`finishDateFor` (TASK-03) aceitam (ou podem ser ajustados para aceitar) um client de transação Prisma opcional — se hoje só usam `PrismaService` global, ajustar a assinatura aqui em vez de duplicar a lógica de fila dentro de `production-order.service.ts`.
2. Criar `ReserveProductionOrderDto`/`ReserveProductionOrderShipmentDto` com `class-validator` (`@IsInt`, `@IsEnum(SimulationMode)`, `@ValidateNested`), no mesmo padrão de `src/orders/dto/create-order.dto.ts`.
3. Extrair uma constante `RESERVATION_TTL_MS = 15 * 60 * 1000` (mesmo valor hoje hardcoded em `checkout.service.ts:115`), reaproveitada aqui de forma independente (não importar de `checkout.service.ts` para não criar acoplamento entre os dois módulos — duplicar a constante é aceitável e mais seguro que uma dependência cruzada).
4. Implementar `reserve(dto)`: dentro de `this.prisma.$transaction(async (tx) => {...}, { maxWait: 5000, timeout: 10000 })` (timeouts maiores que o default, para acomodar espera de lock sob concorrência):
   - Montar a lista de pares únicos `(workshopId, productId)` de `dto.shipments`, ordenados deterministicamente (`workshopId` asc, depois `productId` asc).
   - Para cada par, na ordem: `await tx.$queryRaw`SELECT monthly_capacity, active FROM production_capacity WHERE transformation_workshop_fk = ${workshopId} AND product_fk = ${productId} FOR UPDATE`;`.
   - Validar `active = true`; se `false`, `throw new HttpException('Capacidade de produção não está mais ativa para este item', HttpStatus.CONFLICT)` — aborta a transação inteira (nenhuma reserva parcial).
   - Recalcular `estimated_ready_at = await this.productionQueueService.finishDateFor(workshopId, productId, quantity, tx)`.
   - `tx.production_reservation.create({ data: { product: {connect}, transformation_workshop: {connect}, quantity, user: {connect: {id: dto.userId}}, expires_at: expiresAt, estimated_ready_at } })`.
5. Antes de criar as novas reservas, limpar reservas pendentes do mesmo usuário sem `order_fk` (`tx.production_reservation.deleteMany({ where: { user_fk: dto.userId, order_fk: null } })`) — evita acumular fatias órfãs se o cliente reabrir a jornada de encomenda.
6. Estender a limpeza de expiradas: `production_reservation.deleteMany({ where: { expires_at: { lte: new Date() }, order_fk: null } })`, exposta como método próprio (`releaseExpiredProductionReservations`), chamada no início de `reserve()` (mesmo padrão de `checkout.service.ts:108`).
7. Adicionar `POST /production-order/reserve` em `ProductionOrderController`.
8. Tratamento de erro consistente: usar `HttpException` com status apropriado (`BAD_REQUEST` para capacidade insuficiente, `CONFLICT` para capacidade desativada entre simulação e reserva) — nunca `throw new Error` genérico.
9. Escrever testes unitários cobrindo: reserva bem-sucedida de uma e várias fatias; capacidade desativada entre simulação e reserva (transação abortada, nenhuma reserva parcial); limpeza de reservas antigas do mesmo usuário; teste de concorrência (duas chamadas `reserve` simultâneas para o mesmo par, idealmente contra um MySQL real de dev, já que mocks de Prisma não reproduzem lock de linha do InnoDB).

## Critérios de aceite

- `POST /production-order/reserve` devolve `expiresAt` + lista de reservas criadas, cada uma com `productionReservationId` e `estimatedReadyAt` recalculado no servidor.
- Duas chamadas concorrentes de `reserve` para o mesmo par `(workshop, produto)` não produzem `production_reservation` com `estimated_ready_at` sobrepostos calculados a partir do mesmo `queueTail` — a segunda enxerga a fila já avançada pela primeira.
- `estimated_ready_at` é sempre calculado no servidor no momento da reserva, nunca aceito do payload do cliente.
- Se `production_capacity.active = false` para algum par no momento da reserva, a transação inteira é abortada — nenhuma reserva parcial.
- Reservas expiradas (`expires_at <= now`, `order_fk = null`) são removidas antes de cada nova reserva.
- Nenhuma alteração de comportamento em `checkout.service.ts`/`stock_reservation`/`inventory` — este módulo é inteiramente novo e isolado.
- Erros de capacidade insuficiente/desativada retornam HTTP 4xx, nunca 500.

## Validação

- Testes unitários com `PrismaService` mockado, cobrindo os cenários do passo 9.
- Teste de concorrência contra MySQL real de dev: duas chamadas `reserve` em paralelo (`Promise.all`) para o mesmo par, conferindo que a fila é respeitada (datas não sobrepostas).
- Repetir o cenário motivador (encomenda de 30 unidades, OT A 35/mês, OT B 15/mês) chamando `POST /production-order/reserve` com os `shipments` que `POST /production-order/simulate` (TASK-04) devolveria, e conferir no banco as `production_reservation` criadas.
- Rodar lint e build do projeto.

## Riscos

- `ProductionQueueService` (TASK-03) pode não aceitar um client de transação como parâmetro — se `reserve()` chamar `getQueueTail`/`finishDateFor` fora da `tx`, o lock de `production_capacity` não impede a mesma race que esta tarefa existe para fechar.
- Aumentar `timeout`/`maxWait` da transação é uma faca de dois gumes sob alta concorrência real.
- `SELECT ... FOR UPDATE` com ordenação incorreta entre chamadas concorrentes pode gerar deadlock — mapear outros pontos que escrevem em `production_capacity` (ex. tela de admin) para confirmar a mesma convenção de ordenação.
- `production_capacity.active = false` verificado tarde demais pode gerar experiência ruim se o cliente já viu o plano na simulação.

## Mitigação

- Ler o código entregue pela TASK-03 antes de iniciar; ajustar `ProductionQueueService` para aceitar `tx` opcional em vez de duplicar a lógica de fila.
- Documentar em comentário a ordem de aquisição de locks adotada (`workshopId` → `productId`).
- Cobrir o teste de concorrência como parte obrigatória da suíte antes do merge, não como validação manual avulsa.
- Mensagem de erro clara quando a capacidade for desativada entre simulação e reserva, orientando o cliente a simular novamente.
