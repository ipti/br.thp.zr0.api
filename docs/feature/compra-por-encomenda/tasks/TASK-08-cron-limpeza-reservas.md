# TASK-08 - Cron de limpeza de reservas expiradas (stock_reservation e production_reservation)

## Metadados

- **Prioridade:** P1
- **Status:** Não iniciada
- **Dependências:** TASK-02 (lock/limpeza de `stock_reservation`), TASK-05 (limpeza de `production_reservation`)
- **Bloqueia:** TASK-09

> **Nota de escopo:** como os dois fluxos agora vivem em módulos independentes (`checkout` para Pronta Entrega, `production-order` para Encomenda), este cron passa a orquestrar **duas chamadas separadas** — uma por módulo — em vez de uma única função estendida. Isso reforça, mais uma vez, o isolamento entre os dois fluxos.

## Objetivo

Introduzir um job agendado (`@nestjs/schedule`, hoje ausente do projeto) que libere periodicamente reservas expiradas em `stock_reservation` (via `CheckoutService`) **e** `production_reservation` (via `ProductionOrderService`), eliminando a dependência atual de que a limpeza só rode como efeito colateral de uma nova chamada de reserva em cada módulo. Sem esse cron, estoque e capacidade de produção reservados por um checkout abandonado ficam bloqueados até que outro cliente tente reservar o mesmo par (produto, OT) — o que pode nunca acontecer em produtos de baixo giro.

## Escopo

- Adicionar a dependência `@nestjs/schedule` e registrar `ScheduleModule.forRoot()` globalmente em `src/app.module.ts`.
- Criar um scheduler dedicado, fora dos módulos `checkout`/`production-order`, que injeta os dois serviços e dispara ambas as limpezas no mesmo ciclo (podem ter cadências diferentes se fizer sentido, mas o padrão inicial é o mesmo intervalo para os dois).
- Impedir sobreposição de execuções concorrentes do job (guarda simples em memória).
- Logar, a cada execução, quantas linhas de cada tabela foram removidas e a duração do ciclo.
- Tornar os endpoints manuais (`POST /checkout/release-expired` e o equivalente em `production-order`, se existir) autenticados.
- Tornar o intervalo do cron configurável via variável de ambiente.
- **Fora do escopo:** lock distribuído entre múltiplas instâncias do processo Node; alterar o TTL de 15 minutos; qualquer mudança na lógica de negócio de reserva/lock em si (TASK-02/TASK-05).

## Arquivos previstos

- `package.json` — nova dependência `@nestjs/schedule`.
- `.env.example`/`.env` — nova variável `RESERVATION_CLEANUP_CRON`.
- `src/app.module.ts` — importar `ScheduleModule.forRoot()`.
- `src/checkout/checkout.service.ts` — `releaseExpiredReservations()` (limpeza de `stock_reservation`, entregue/ajustada pela TASK-02) consumida pelo novo scheduler.
- `src/production-order/shared/production-order.service.ts` — `releaseExpiredProductionReservations()` (limpeza de `production_reservation`, entregue pela TASK-05) consumida pelo novo scheduler.
- Novo arquivo `src/scheduler/reservation-cleanup.scheduler.ts` — provider com `@Cron(...)`, injetando `CheckoutService` **e** `ProductionOrderService`, chamando as duas limpezas.
- Novo módulo `src/scheduler/scheduler.module.ts` — `imports: [CheckoutModule, ProductionOrderModule]`, `providers: [ReservationCleanupScheduler]`; registrado em `src/app.module.ts`.
- `src/checkout/checkout.controller.ts` — proteger `POST /checkout/release-expired` com `@UseGuards(JwtAuthGuard)`.
- `src/production-order/production-order.controller.ts` — expor (se ainda não existir) um endpoint manual equivalente, também protegido.
- Novo arquivo `src/scheduler/reservation-cleanup.scheduler.spec.ts`.

## Passos de implementação

1. Instalar `@nestjs/schedule` (ausente hoje — confirmar em `package.json`) e adicionar às `dependencies`.
2. Em `src/app.module.ts`, importar `ScheduleModule` de `@nestjs/schedule` e adicionar `ScheduleModule.forRoot()` ao array `imports`.
3. Confirmar que `CheckoutService.releaseExpiredReservations()` (TASK-02) limpa `stock_reservation` com lock coerente, e que `ProductionOrderService.releaseExpiredProductionReservations()` (TASK-05) limpa `production_reservation` — ambos retornando uma contagem (`{ released: number }`).
4. Criar `src/scheduler/scheduler.module.ts`, importando `CheckoutModule` e `ProductionOrderModule` (ambos precisam exportar seus respectivos services, se ainda não exportarem).
5. Criar `src/scheduler/reservation-cleanup.scheduler.ts`: classe `@Injectable()` decorada com `@Cron(process.env.RESERVATION_CLEANUP_CRON ?? CronExpression.EVERY_5_MINUTES)`, injetando `CheckoutService` e `ProductionOrderService`. Chamar as duas limpezas (podem rodar em paralelo, `Promise.all`, já que atuam sobre tabelas/módulos independentes). Logar contagem por tabela e duração total.
6. Adicionar guarda contra sobreposição (flag `isRunning` em memória) e `try/catch` com `Logger.error` em torno de cada chamada — uma falha na limpeza de `production_reservation` não deve impedir a limpeza de `stock_reservation` no mesmo ciclo (chamadas independentes, não uma dependendo da outra).
7. Registrar `ReservationCleanupScheduler` nos `providers` de `SchedulerModule`; registrar `SchedulerModule` em `src/app.module.ts`.
8. Proteger `POST /checkout/release-expired` com `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth('access-token')`. Se a TASK-05 tiver exposto um endpoint manual equivalente em `production-order`, proteger da mesma forma.
9. Adicionar `RESERVATION_CLEANUP_CRON=*/5 * * * *` em `.env.example`.
10. Escrever/expandir specs cobrindo: execução normal chama as duas limpezas; segunda invocação enquanto a primeira "roda" é ignorada; exceção em uma das duas limpezas não impede a outra nem derruba o processo.

## Critérios de aceite

- `@nestjs/schedule` instalado e `ScheduleModule.forRoot()` registrado globalmente, sem quebrar o boot da aplicação.
- A limpeza de `stock_reservation` (Pronta Entrega) e de `production_reservation` (Encomenda) rodam automaticamente no intervalo configurado, cada uma por seu próprio serviço/módulo.
- Duas execuções do scheduler nunca rodam em paralelo.
- Falha na limpeza de um dos dois recursos é logada e não impede a limpeza do outro.
- Endpoints manuais de limpeza exigem token JWT válido.
- Toda execução do job gera um log com contagem por tabela e duração.
- Reservas com `expires_at` no futuro, ou já vinculadas a um `order_fk`, nunca são removidas.

## Validação

- Rodar a suíte de testes (`reservation-cleanup.scheduler.spec.ts` e os specs de `checkout`/`production-order` que cobrem as limpezas individuais).
- `npm run build` para garantir que a nova dependência e o novo módulo compilam sem erro de tipo/dependência circular (`SchedulerModule` importa `CheckoutModule`/`ProductionOrderModule`, não o contrário).
- Teste manual: inserir reservas expiradas nas duas tabelas, reduzir temporariamente o intervalo do cron, e confirmar via consulta ao banco que ambas são limpas no mesmo ciclo.
- Confirmar que uma reserva com `order_fk` preenchido não é removida em nenhuma das duas tabelas.
- Chamar os endpoints manuais sem token e confirmar `401`.

## Riscos

- Múltiplas instâncias do processo disparando o cron de forma independente (escalonamento horizontal) — não gera overselling, mas pode gerar `deleteMany` concorrentes redundantes.
- Intervalo mal calibrado (frequente demais sobrecarrega o banco; espaçado demais atrasa a liberação de recursos reservados indevidamente).
- Dependência de que TASK-02 e TASK-05 já tenham entregue métodos de limpeza funcionais e testados isoladamente antes desta tarefa orquestrá-los juntos.
- Falha silenciosa dentro do `@Cron()` sem tratamento explícito de erro.

## Mitigação

- Documentar que o cron assume instância única do processo até que um lock distribuído seja avaliado.
- Expor o intervalo via variável de ambiente, com valor conservador inicial (5 minutos).
- Envolver cada chamada de limpeza em `try/catch` independente, com `Logger.error` explícito, garantindo que uma falha não mascare a outra.
- Adicionar teste de regressão confirmando que nenhuma limpeza remove reserva com `order_fk` preenchido.
