# TASK-04 - Endpoint de simulação do Pedido de Encomenda (custo x prazo)

## Metadados

- **Prioridade:** P0
- **Status:** Não iniciada
- **Dependências:** TASK-03 (serviço de fila/capacidade de produção)
- **Bloqueia:** TASK-05 (Checkout do Pedido de Encomenda com lock de concorrência)

> **Nota de escopo:** a versão anterior desta tarefa implementava um algoritmo de "duas ondas" (estoque + produção) dentro de um único endpoint `POST /shipping/simulate`. Isso foi descartado: o Pedido de Encomenda agora é um **fluxo isolado**, que nunca consulta `inventory`/estoque. Esta tarefa implementa **só** o algoritmo de produção (o que antes era chamado de "onda 2"), rodando sobre a quantidade total escolhida livremente pelo cliente — não sobre um "resíduo" de outro cálculo.

## Objetivo

Implementar o núcleo algorítmico da simulação do Pedido de Encomenda — alocação de produção entre Oficinas de Transformação (OTs) com capacidade declarada (`production_capacity`), calculada nos **dois modos** de otimização (**custo** e **prazo**) — e expor o resultado através do novo endpoint `POST /production-order/simulate`, que devolve `{ costPlan, deadlinePlan }` com o detalhamento de remessas (`shipments[]`) por OT. Este é o serviço que o checkout de encomenda (TASK-05) vai consumir.

## Escopo

- Estender `MeuEnvioShippingStrategy.calculatePrice` (`src/shipping/strategies/meu-envio-shipping.strategy.ts:63-97`) para também devolver `delivery_time` do Melhor Envio, hoje descartado (reaproveitado dos dois fluxos, mas a correção em si é feita aqui por ser pré-requisito direto desta simulação).
- Criar o novo módulo `src/production-order/` (usado também pelas TASK-05/TASK-06), com o serviço de simulação (`ProductionOrderSimulationService` ou equivalente) e o controller expondo `POST /production-order/simulate`.
- Implementar a busca de candidatos: todas as OTs com `production_capacity.active = true` para o produto pedido.
- Implementar o modo custo (atribui a quantidade inteira à OT ativa de frete mais barato).
- Implementar o modo prazo (algoritmo guloso incremental por "chunks", particionando entre OTs para minimizar o prazo máximo).
- Implementar a resposta de "pedido indisponível" quando nenhuma OT tiver capacidade ativa para o produto — nunca uma exceção genérica nem um `HTTP 200` com dado incompleto.
- Cobrir com testes unitários o cenário motivador da escola (encomenda de 30 ou 50 unidades, OT A 35/mês, OT B 15/mês).
- **Fora de escopo:** qualquer leitura de `inventory`/`stock_reservation` (não existe onda de estoque neste fluxo); reserva de capacidade e lock de concorrência (TASK-05); criação efetiva do pedido (TASK-06); dimensões reais de frete além da propagação de `delivery_time` (TASK-07, aplicada aos dois fluxos); qualquer escrita no banco — `simulate()` é uma operação **somente leitura**.

## Arquivos previstos

- `src/shipping/strategies/meu-envio-shipping.strategy.ts` — extensão de `calculatePrice` para também retornar `delivery_time` (reaproveitado pelos dois fluxos).
- `src/production-order/production-order.module.ts` (novo) — `imports: [PrismaModule, ProductionModule]` (para injetar `ProductionQueueService`, TASK-03).
- `src/production-order/production-order.controller.ts` (novo) — `POST /production-order/simulate`.
- `src/production-order/shared/production-order.service.ts` (novo) — algoritmo de simulação (métodos privados de modo custo/prazo); ganha `reserve`/`create` nas TASK-05/TASK-06.
- `src/production-order/dto/simulate-production-order.dto.ts` (novo) — `{ productId: string; quantity: number }`.
- `src/production-order/entities/simulation.entity.ts` (novo) — `ShipmentAllocation`, `SimulationPlan`, `SimulationResult`.
- `src/app.module.ts` — registrar `ProductionOrderModule`.
- `src/production/shared/production-queue.service.ts` — **consumido, não criado aqui** (entregue pela TASK-03).
- `src/production-order/shared/production-order.service.spec.ts` (novo) — testes do algoritmo.
- `src/production-order/production-order.controller.spec.ts` (novo) — teste do endpoint.

## Passos de implementação

1. **Estender `calculatePrice`** (`meu-envio-shipping.strategy.ts:63-97`): hoje devolve só um `number` obtido de `response?.data?.find((item) => item.price)?.price` (linha 93-96) — o **primeiro** item com preço, não o mais barato. Alterar para filtrar `error == null`, escolher o mesmo "bestOption" por menor custo (mesma regra de `calculate()`, linhas 54-55), e retornar `{ cost: number; deliveryTimeDays: number; service: string }` usando `bestOption.delivery_time`. Manter os parâmetros de dimensão (`altura/largura/comprimento/peso`, defaults `20/20/20/1`) inalterados — a correção de dimensões reais é TASK-07.
2. **Criar `src/production-order/entities/simulation.entity.ts`**:
   ```ts
   import { SimulationMode } from '@prisma/client';

   export interface ShipmentAllocation {
     workshopId: number;
     workshopName: string;
     quantity: number;
     freightCost: number;
     freightService: string;
     freightDeliveryDaysBusiness: number;
     readyAt: Date;   // finishDateFor(...) — sempre produção do zero
     deliveryAt: Date; // readyAt + trânsito convertido em dias corridos
   }

   export interface SimulationPlan {
     mode: SimulationMode;
     shipments: ShipmentAllocation[];
     totalCost: number;
     maxDeliveryAt: Date;
   }

   export interface SimulationResult {
     costPlan: SimulationPlan;
     deadlinePlan: SimulationPlan;
     unavailable?: boolean; // true = nenhuma OT com capacidade ativa para o produto
   }
   ```
3. **Buscar candidatos ativos** via `ProductionQueueService`/`ProductionCapacityService` (TASK-03) — todas as `production_capacity.active = true` para o `productId` pedido. Se a lista vier vazia, retornar `{ unavailable: true }` imediatamente, sem calcular planos.
4. **Cotar frete** para cada candidato com `calculatePrice` (passo 1) e obter `queueTail` via `ProductionQueueService.getQueueTail(workshopId, productId)` (TASK-03).
5. **Modo custo**: atribuir a quantidade inteira ao candidato de menor `freightCost`; `readyAt = finishDateFor(workshopId, productId, quantity)` (TASK-03). Só recorrer a outro candidato por inviabilidade técnica.
6. **Modo prazo** (particionamento entre OTs), scheduling guloso incremental por "chunks":
   ```
   chunkSize = max(1, ceil(quantity / (candidatos.length * 5)))
   cursores = candidatos.map(c => ({ ...c, queueTail: getQueueTail(...), allocated: 0 }))
   enquanto restante > 0:
     para cada cursor, projete finishAt = queueTail + chunk * 30 / monthlyCapacity
     projete deliveryAt = finishAt + freightDeliveryDaysBusiness convertido para dias corridos
     escolha o cursor de menor deliveryAt projetado
     aloque chunk = min(chunkSize, restante) a esse cursor; avance cursor.queueTail = finishAt
     restante -= chunk
   ```
   Descartar cursores com `allocated == 0` ao final; transformar o restante em `ShipmentAllocation[]`.
7. **Converter dias úteis → dias corridos** de forma consistente nos dois modos: `diasCorridos = Math.ceil(deliveryTimeBusinessDays * 7 / 5)`, somado à duração de produção (já em dias corridos). Documentar como estimativa, não garantia contratual.
8. **Montar `simulate(dto): Promise<SimulationResult>`** em `ProductionOrderService`: roda os passos 3-7 uma vez por modo (`COST`, `DEADLINE`); calcula `totalCost` (soma dos fretes) e `maxDeliveryAt` (maior `deliveryAt` entre as remessas de cada plano).
9. **Adicionar `POST /production-order/simulate`** em `ProductionOrderController`, recebendo `SimulateProductionOrderDto { productId, quantity }`.
10. **Registrar `ProductionOrderModule`** em `src/app.module.ts`, com `imports: [PrismaModule, ProductionModule]` para injetar `ProductionQueueService` (TASK-03 precisa exportá-lo do `ProductionModule`).
11. **Escrever testes unitários**, mockando `PrismaService`, `MeuEnvioShippingStrategy` e `ProductionQueueService`, cobrindo:
    - Cenário motivador: 30 (e depois 50) unidades pedidas, OT A `monthly_capacity=35`, OT B `monthly_capacity=15`, ambas com fila vazia — nos dois modos.
    - Nenhuma OT com capacidade ativa para o produto → `{ unavailable: true }`, sem exceção.
    - Empate de frete entre 2 OTs no modo custo (desempate determinístico, documentado no código).
    - Nenhuma chamada de escrita (`create`/`update`/`delete`) no mock de `PrismaService` durante `simulate()`.
    - Invariante: `deadlinePlan.maxDeliveryAt <= costPlan.maxDeliveryAt`.

### Exemplo ilustrativo de resposta

Cenário: encomenda de 30 unidades; `production_capacity` ativa: OT A 35/mês, OT B 15/mês; frete OT A mais barato.

```json
{
  "costPlan": {
    "mode": "COST",
    "shipments": [
      { "workshopId": 1, "quantity": 30, "freightCost": 18.0, "readyAt": "2026-08-25", "deliveryAt": "2026-08-29" }
    ],
    "totalCost": 18.0,
    "maxDeliveryAt": "2026-08-29"
  },
  "deadlinePlan": {
    "mode": "DEADLINE",
    "shipments": [
      { "workshopId": 1, "quantity": 21, "freightCost": 18.0, "readyAt": "2026-08-17", "deliveryAt": "2026-08-21" },
      { "workshopId": 2, "quantity": 9,  "freightCost": 25.0, "readyAt": "2026-08-18", "deliveryAt": "2026-08-22" }
    ],
    "totalCost": 43.0,
    "maxDeliveryAt": "2026-08-22"
  }
}
```

O `deadlinePlan` particiona entre OT A e OT B para reduzir o prazo máximo (~22/ago vs. ~29/ago do `costPlan`), ao custo de uma remessa extra. É o trade-off central que o cliente vê ao escolher entre os dois modos.

## Critérios de aceite

- `POST /production-order/simulate` aceita `{ productId, quantity }` e retorna `{ costPlan, deadlinePlan }`, cada um com `shipments[]`, `totalCost` e `maxDeliveryAt`.
- O cenário da escola (30 ou 50 unidades, OT A 35/mês, OT B 15/mês) resolve corretamente nos dois modos.
- `simulate()` nunca consulta `inventory`/`stock_reservation` — o pedido de encomenda é tratado inteiramente como produção nova.
- Invariante: `deadlinePlan.maxDeliveryAt` nunca é posterior a `costPlan.maxDeliveryAt`.
- `simulate()` não realiza nenhuma escrita no banco.
- Produto sem nenhuma OT com `production_capacity.active = true` retorna `{ unavailable: true }`, nunca exceção genérica.
- Todos os testes do passo 11 passam.

## Validação

- Rodar a suíte de testes do módulo (`production-order.service.spec.ts`, `production-order.controller.spec.ts`).
- Rodar lint/build do projeto nos arquivos alterados/criados.
- Chamar manualmente `POST /production-order/simulate` recriando o cenário da escola (30 e 50 unidades) e inspecionar o JSON de resposta.
- Confirmar, antes de iniciar, que a TASK-03 já entrega `ProductionQueueService`/`production_capacity` funcionando no ambiente de desenvolvimento.

## Riscos

- Depende do formato exato que `ProductionQueueService` (TASK-03) entrega; mudanças de assinatura exigem ajuste aqui.
- `production.date_end = null` em lançamentos manuais antigos pode afetar o `MAX()` usado por `getQueueTail` — risco herdado, mitigado na TASK-03.
- A conversão dias úteis → dias corridos é uma aproximação.
- O algoritmo guloso por chunks é uma heurística, não uma otimização combinatória exata.
- Cada candidato dispara uma chamada a `calculatePrice` (Melhor Envio) sem cache — muitos candidatos podem esbarrar em rate limit.

## Mitigação

- Validar a assinatura de `ProductionQueueService` com quem implementou a TASK-03 antes de codificar a integração.
- Tratar `date_end = null` como já definido na TASK-03 (ignorar no cálculo, logar aviso).
- Documentar a conversão de dias úteis/corridos como estimativa não contratual.
- Rodar as cotações de frete em paralelo (`Promise.all`) por candidato dentro de uma mesma chamada de `simulate()`.
- Corrigir a seleção de `calculatePrice` para a mesma regra de "menor custo" já usada em `calculate()`.
