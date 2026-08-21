# Tarefas — Compra por Encomenda (Backend)

## Convenções

- **Status inicial:** Não iniciada.
- **Prioridade:** P0 é bloqueadora, P1 é necessária para a entrega e P2 é melhoria de qualidade.
- Alterações de schema exigem `npx prisma migrate dev` e conferência do backfill antes de seguir para a próxima tarefa dependente.
- O módulo `production-order` (Pedido de Encomenda) nunca deve importar de `orders`/`checkout` (Pronta Entrega), e vice-versa — os dois fluxos são independentes.

## Mapa de tarefas

| Código | Tarefa | Prioridade | Dependência |
|---|---|---:|---|
| TASK-01 | Schema Prisma — sale_type no pedido, capacidade e fila de produção | P0 | Nenhuma (**Concluída**) |
| TASK-02 | Migração do fluxo de Pronta Entrega para `inventory` | P0 | TASK-01 (**Concluída**) |
| TASK-03 | Serviço de fila e capacidade de produção | P0 | TASK-01 (**Concluída**) |
| TASK-04 | Endpoint de simulação do Pedido de Encomenda (custo x prazo) | P0 | TASK-03 (**Concluída**) |
| TASK-05 | Checkout do Pedido de Encomenda com lock de concorrência | P0 | TASK-04 (**Concluída**) |
| TASK-06 | Criação do Pedido de Encomenda | P0 | TASK-05 (**Concluída**) |
| TASK-07 | Frete com dimensões reais do produto | P1 | Nenhuma (**Concluída**) |
| TASK-08 | Cron de limpeza de reservas expiradas | P1 | TASK-02, TASK-05 (**Concluída**) |
| TASK-09 | Testes e validação end-to-end dos dois fluxos | P0 | TASK-01 a TASK-08 (**Concluída** — e2e com banco dedicado adiado, ver nota) |

## Fluxo de execução

```text
TASK-01
  ├── TASK-02 (Pronta Entrega, independente daqui em diante)
  └── TASK-03 ── TASK-04 ── TASK-05 ── TASK-06 ──┐
                                  └── TASK-08 ────┤
TASK-07 (independente) ───────────────────────────┤
                                                    ↓
                                                TASK-09
```

## Arquivos

- [TASK-01 — Schema Prisma](./TASK-01-schema-prisma.md)
- [TASK-02 — Migração do fluxo de Pronta Entrega para inventory](./TASK-02-migracao-estoque-inventory.md)
- [TASK-03 — Serviço de fila e capacidade de produção](./TASK-03-servico-fila-capacidade.md)
- [TASK-04 — Endpoint de simulação do Pedido de Encomenda](./TASK-04-simulacao-encomenda-endpoint.md)
- [TASK-05 — Checkout do Pedido de Encomenda com lock de concorrência](./TASK-05-checkout-encomenda-lock.md)
- [TASK-06 — Criação do Pedido de Encomenda](./TASK-06-pedido-encomenda-criacao.md)
- [TASK-07 — Frete com dimensões reais do produto](./TASK-07-frete-dimensoes-reais.md)
- [TASK-08 — Cron de limpeza de reservas expiradas](./TASK-08-cron-limpeza-reservas.md)
- [TASK-09 — Testes e validação end-to-end](./TASK-09-testes-validacao-e2e.md)
