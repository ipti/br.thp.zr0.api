# Compra por Encomenda

## Identificação

- **Feature:** COMPRA-POR-ENCOMENDA
- **Status:** Planejada
- **Área:** Estoque / Produção / Frete / Checkout / Pedidos (Backend)
- **Módulos afetados:** `shipping`, `checkout`, `orders`, `inventory`, `production`, novos módulos `production-capacity` e `production-order`
- **Objetivo:** Implementar dois fluxos de pedido completamente independentes: o Pedido de Pronta Entrega já existente (ajustado para usar `inventory` como fonte de estoque, sem fallback para produção) e um novo Pedido de Encomenda (módulo `production-order`), onde o cliente escolhe livremente a quantidade e o sistema simula/reserva/confirma a produção entre OTs com capacidade declarada, nos modos custo e prazo.

## Documentos

- [História funcional](./historia-funcional.md)
- [História técnica](./historia-tecnica.md)
- [Plano de tarefas](./tasks/README.md)

## Problemas que motivam a feature

- `orders.service.ts` lança "Estoque insuficiente" quando a OT escolhida não tem estoque, sem nenhuma alternativa de produção sob demanda.
- Não existe conceito de capacidade de produção declarada por OT, nem de fila/backlog de compromissos.
- Duas fontes de verdade coexistem para estoque (`inventory` e `transformation_workshop_product.quantity`), gerando risco de inconsistência.
- Reservas de estoque não têm lock de concorrência, criando risco de overselling.
- O cálculo de frete usa dimensões genéricas do produto em vez das dimensões reais já cadastradas.

## Resultado esperado

- Pedido de Pronta Entrega (`orders`/`checkout`/`shipping` existentes) migrado para `inventory`, com lock de concorrência, permanecendo limitado ao estoque disponível.
- Novo módulo `production-order` com `POST /production-order/simulate` (duas simulações completas, custo e prazo, sem nunca consultar estoque), `POST /production-order/reserve` (reserva de capacidade com lock) e `POST /production-order` (criação do pedido, `order.sale_type = ENCOMENDA`).
- Schema Prisma com `production_capacity`, `production_reservation`, `sale_type`/`simulation_mode` no nível do `order` (não do item/remessa), e extensões em `production`.
- Frete calculado com as dimensões reais do produto, em ambos os fluxos.

## Fora do escopo

- Interface do cliente (frontend) — ver documentação em `br.thp.zr0/docs/feature/compra-por-encomenda`.
- Qualquer lógica que combine estoque e produção num único pedido — os dois fluxos são e permanecem independentes.
- Recalcular pedidos já confirmados quando a capacidade de uma OT mudar depois.
- Frete com transportadora própria fora do Melhor Envio.
- Remoção definitiva da coluna `transformation_workshop_product.quantity` (fica congelada nesta entrega, remoção fica para depois).

## Ordem recomendada

1. Schema Prisma (sale_type no pedido, capacidade e fila de produção).
2. Migração do fluxo de Pronta Entrega para `inventory`.
3. Serviço de fila e capacidade de produção.
4. Endpoint de simulação do Pedido de Encomenda (custo x prazo).
5. Checkout do Pedido de Encomenda com lock de concorrência.
6. Criação do Pedido de Encomenda.
7. Frete com dimensões reais do produto.
8. Cron de limpeza de reservas expiradas.
9. Testes e validação end-to-end dos dois fluxos.
