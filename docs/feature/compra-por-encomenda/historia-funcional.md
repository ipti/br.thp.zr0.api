# Historia funcional - Compra por Encomenda

## Identificação

- **Código:** HF-ENCOMENDA-001
- **Título:** Compra por Encomenda (Pedido de Pronta Entrega e Pedido de Encomenda separados)
- **Prioridade:** Alta
- **Área:** Carrinho / Simulação de frete / Checkout / Pedidos / Produção — dois fluxos independentes, back-end e front-end

## Contexto

Hoje o sistema só vende "pronta entrega": quando o cliente pede uma quantidade maior do que o estoque disponível na Oficina de Transformação (OT) escolhida, o pedido simplesmente falha com "Estoque insuficiente". Não existe nenhuma forma de o cliente completar sua necessidade através de produção sob encomenda.

Cenário motivador: uma escola quer **50 cadeiras**. O estoque agregado de todas as OTs que produzem esse item é **20 unidades**. Hoje isso significaria um pedido que falha ou fica limitado a 20 unidades. Com esta feature, a escola passa a ter **duas opções independentes**:

- **Pedido de Pronta Entrega** — comprar as 20 unidades disponíveis agora.
- **Pedido de Encomenda** — abrir, separadamente, um pedido pela quantidade que ela quiser (30 unidades, as 50 completas, ou qualquer outro valor), que será produzida do zero e dividida entre as OTs com capacidade declarada (por exemplo, OT A produz 35 unidades/mês e OT B produz 15 unidades/mês), segundo o modo de simulação escolhido — **modo custo** (prioriza a OT mais barata, mesmo que demore mais) ou **modo prazo** (prioriza o menor tempo total, mesmo que custe mais, podendo produzir em paralelo em várias OTs).

**Os dois pedidos nunca se combinam num único pedido, nem aparecem juntos na mesma tela/momento de decisão** — são jornadas de compra completamente distintas. O cliente pode até realizar os dois (comprar o que está pronto e, à parte, encomendar o restante), mas isso é sempre duas ações de compra separadas.

## História de usuário

**Como** cliente comprador,
**quero** comprar a quantidade de um produto que já está disponível em estoque agora,
**para** receber rapidamente sem depender de produção, mesmo que seja menos do que eu inicialmente desejava.

**Como** cliente comprador,
**quero** abrir, separadamente, um pedido de encomenda pela quantidade que eu desejar de um produto,
**para** completar minha necessidade através de produção sob demanda, escolhendo entre um plano mais barato ou mais rápido, sem depender do estoque pronto atual.

## Objetivos funcionais

1. Permitir que o cliente compre, como Pedido de Pronta Entrega, exatamente a quantidade disponível agora em estoque agregado entre as OTs — sem qualquer fallback automático para produção.
2. Permitir que o cliente abra, como jornada separada e independente, um Pedido de Encomenda pela quantidade que desejar, sem relação com o estoque pronto atual.
3. Garantir que os dois tipos de pedido nunca se misturem: um pedido é sempre 100% Pronta Entrega ou 100% Encomenda.
4. Registrar a capacidade de produção mensal de cada OT por produto, como uma taxa contínua, sem depender de controle manual de "baldes" que resetam por calendário.
5. Calcular a fila (backlog) de cada OT considerando compromissos já assumidos — tanto lançamentos manuais da oficina quanto os originados de pedidos de encomenda — para prever com precisão a data de disponibilidade de uma nova fatia.
6. Sempre apresentar ao cliente, dentro da jornada de encomenda, as duas simulações completas — modo custo e modo prazo — antes de qualquer decisão de compra.
7. Permitir o fatiamento do pedido de encomenda entre quantas OTs forem necessárias, sem limite, em ambos os modos de simulação.
8. Permitir que o modo prazo paralelize a produção entre múltiplas OTs simultaneamente para reduzir a data de entrega final do pedido de encomenda.
9. Exibir o prazo do pedido de encomenda sempre detalhado por remessa/OT, nunca como uma única data agregada.
10. Reservar temporariamente (com TTL) a fatia de capacidade de produção alocada durante o checkout de encomenda, evitando que dois clientes disputem a mesma fatia de fila.
11. Alertar explicitamente o cliente quando um produto não tiver nenhuma OT com capacidade de produção cadastrada e ativa para atender um pedido de encomenda.
12. Migrar a fonte de verdade do estoque de pronta entrega para o ledger de `inventory`, eliminando a duplicidade hoje existente em `transformation_workshop_product`.
13. Corrigir, no mesmo esforço, dois problemas pré-existentes que esta feature toca e agrava: a ausência de lock de concorrência nas reservas (estoque e capacidade) e o cálculo de frete com dimensões genéricas em vez das dimensões reais do produto — aplicando-se aos dois fluxos.

## Perfis impactados

### Cliente comprador

- No fluxo de **Pronta Entrega**: monta o carrinho normalmente, limitado à quantidade disponível em estoque agregado; não vê nem escolhe nada relacionado a produção nesse fluxo.
- No fluxo de **Encomenda**: acessa uma jornada própria e separada, informa a quantidade desejada, visualiza as duas simulações completas (custo e prazo) com detalhamento por remessa/OT, e escolhe uma delas para todo o pedido de encomenda.
- Pode, se quiser, realizar os dois tipos de pedido para o mesmo produto (ex.: comprar o que está disponível agora e, à parte, encomendar mais) — mas são duas ações de compra distintas, nunca um único checkout combinado.
- Acompanha, após a compra, o prazo detalhado por remessa e o status de produção de cada fatia, no caso do pedido de encomenda.
- Recebe um aviso explícito quando não há capacidade cadastrada para atender a quantidade desejada de um pedido de encomenda.

### Oficina / OT (que declara capacidade)

- Declara e mantém atualizada a capacidade de produção mensal por produto (`production_capacity`).
- Tem sua fila (backlog) de compromissos — manuais e de pedidos de encomenda — considerada automaticamente no cálculo de prazo de novas fatias.
- Decide operacionalmente, por conta própria, se atende uma fatia de encomenda produzindo do zero ou aproveitando estoque que já tenha pronto — essa decisão **não é modelada nem prometida pelo sistema**; o prazo informado ao cliente é sempre a estimativa conservadora assumindo produção do zero.
- Visualiza, na mesma tela de produção já existente, tanto os lançamentos manuais quanto os originados de pedidos de encomenda.
- Pode ter fatias de sua capacidade reservadas temporariamente durante o checkout de encomenda de outros clientes, antes da confirmação do pedido.

### Equipe interna (operação/administração)

- Ao cadastrar a associação produto+OT, passa a ter automaticamente criadas as linhas correspondentes em `inventory` (estoque zerado) e em `production_capacity` (inativa), evitando conviver com duas fontes de verdade de estoque.
- Ativa e ajusta a capacidade de produção declarada por cada OT.
- Acompanha pedidos de Pronta Entrega e de Encomenda como fluxos distintos — inclusive nos e-mails de pedido e na tela de pedidos da OT, que passam a indicar claramente o tipo de cada pedido.
- Monitora a limpeza de reservas expiradas, tanto de estoque quanto de capacidade de produção.

## Requisitos funcionais

### RF-01 — Pedido de Pronta Entrega limitado ao estoque agregado

- O sistema deve calcular o estoque disponível de um produto somando o `inventory` (descontadas as reservas ativas) de todas as OTs que o produzem.
- A quantidade solicitada num Pedido de Pronta Entrega nunca pode exceder o estoque agregado disponível no momento da compra.
- A escolha entre as OTs que atendem a pronta entrega continua podendo ser ordenada por frete mais barato ou por prazo de frete mais curto, preenchendo de forma gulosa até fechar a quantidade pedida.
- Este fluxo não aciona, em nenhuma circunstância, nenhuma lógica de produção sob encomenda.

### RF-02 — Pedido de Encomenda como jornada separada, com quantidade livre

- O cliente pode iniciar, a qualquer momento e de forma independente do carrinho de pronta entrega, uma jornada de Pedido de Encomenda para um produto.
- A quantidade desejada no pedido de encomenda é definida livremente pelo cliente — não é derivada nem limitada pelo que "falta" de um pedido de pronta entrega.
- O pedido de encomenda nunca consulta nem consome o estoque pronto atual (`inventory`); toda a quantidade é tratada como produção nova.
- Só devem ser consideradas candidatas as OTs com `production_capacity.active = true` para o produto em questão.

### RF-03 — Nenhuma mistura entre os dois tipos de pedido

- Um pedido (`order`) é sempre inteiramente de um único tipo: Pronta Entrega ou Encomenda — nunca uma combinação dos dois.
- As duas jornadas de compra (pronta entrega e encomenda) são apresentadas ao cliente em momentos e telas distintos, nunca lado a lado na mesma decisão de compra.

### RF-04 — Capacidade de produção declarada por produto por OT (taxa mensal contínua)

- A capacidade deve ser cadastrada na mesma granularidade de `inventory`: um par único (OT, produto), com um valor de capacidade mensal e um indicador de ativação.
- A capacidade representa um ritmo contínuo (unidades por mês), não um saldo que se esgota e reseta a cada período de calendário.
- Pedidos de encomenda maiores que a capacidade mensal de uma única OT devem ser atendidos normalmente: a data de disponibilidade apenas avança de forma proporcional à quantidade, sem regra especial de "quebra" por mês.

### RF-05 — Cálculo de fila/backlog por OT

- A fila de cada OT deve ser calculada a partir do maior compromisso em aberto (data de término de produções em andamento/na fila somada às reservas de capacidade ativas), tomando o maior valor entre esse ponto e o momento atual.
- A data de disponibilidade de uma nova fatia de encomenda deve ser calculada como: fim da fila atual + (quantidade da fatia × 30 dias ÷ capacidade mensal da OT) — sempre assumindo produção do zero, independentemente de a OT ter ou não estoque pronto daquele produto.
- Lançamentos manuais da oficina (sem vínculo a um pedido) e lançamentos originados de pedidos de encomenda devem ser considerados juntos no mesmo cálculo de fila.

### RF-06 — Simulação de encomenda sempre calcula as duas opções (modo custo e modo prazo)

- Toda simulação de um pedido de encomenda deve retornar, na mesma chamada, um plano de modo custo e um plano de modo prazo, cada um com custo total e prazo máximo já calculados.
- O cliente escolhe um único modo para todo o pedido de encomenda; não é permitido montar um pedido de encomenda combinando fatias de planos diferentes.

### RF-07 — Fatiamento entre múltiplas OTs sem limite, em ambos os modos (somente dentro da encomenda)

- Tanto o modo custo quanto o modo prazo podem dividir a quantidade de um pedido de encomenda entre quantas OTs forem necessárias, sem um teto arbitrário de número de fatias.
- Cada fatia resultante deve carregar sua própria OT de origem, quantidade, custo de frete e prazo estimado.

### RF-08 — Modo prazo pode paralelizar entre OTs para reduzir o prazo final

- No modo prazo, o sistema pode atribuir partes da encomenda a múltiplas OTs simultaneamente sempre que isso reduzir a data de entrega final do pedido, em vez de apenas escolher a OT tecnicamente mais rápida sozinha.
- A divisão deve ser incremental (por partes), atribuindo cada novo pedaço à OT que, a cada passo do cálculo, ofereça o menor prazo total combinado (fila de produção + tempo de frete).

### RF-09 — Exibição do prazo detalhada por remessa/OT (pedido de encomenda)

- O prazo apresentado ao cliente — na simulação, no checkout e no acompanhamento do pedido de encomenda — deve sempre discriminar cada remessa individualmente: OT de origem, quantidade, data estimada de disponibilidade e data estimada de entrega.
- Nenhuma tela ou resposta de API deve apresentar uma única data consolidada que esconda a existência de múltiplas remessas.

### RF-10 — Reserva temporária de capacidade com TTL durante o checkout de encomenda

- Ao iniciar o checkout de um pedido de encomenda, o sistema deve reservar a fatia de capacidade de produção correspondente por um período determinado (TTL), seguindo o mesmo padrão hoje aplicado à reserva de estoque.
- A reserva deve congelar a data estimada de disponibilidade calculada no momento em que foi feita.
- Se o checkout não for concluído dentro do TTL, a reserva deve expirar automaticamente e liberar a fatia de capacidade para a fila.

### RF-11 — Aviso explícito quando não há OT com capacidade cadastrada

- Se um produto não tiver nenhuma OT com `production_capacity` ativa, a jornada de encomenda deve informar explicitamente que não é possível atender o pedido para aquele produto no momento, em vez de falhar de forma genérica ou silenciosa.

## Regras de negócio

1. **Dois pedidos independentes e homogêneos, nunca um pedido misto.** Existem dois tipos de pedido — Pronta Entrega e Encomenda — completamente independentes. Um pedido é sempre 100% de um tipo só; não existe cascata automática nem combinação de estoque com produção dentro do mesmo pedido.
2. **Pedido de Pronta Entrega limitado ao estoque agregado.** A quantidade de um pedido de pronta entrega nunca pode exceder o estoque agregado (`inventory`, descontadas reservas ativas) disponível entre todas as OTs que produzem o item. Não há fallback automático para produção dentro deste pedido.
3. **Pedido de Encomenda com quantidade livre, ignorando o estoque atual.** O cliente define livremente a quantidade do pedido de encomenda — pode ser igual, menor ou até maior do que teria "faltado" de um pedido de pronta entrega. O pedido de encomenda nunca consulta nem consome o estoque pronto atual; toda a quantidade é tratada, para fins de cálculo de prazo, como produção nova.
4. **Jornadas de compra desconectadas.** Pronta entrega e encomenda são apresentadas ao cliente como fluxos de compra separados, em telas e momentos distintos — nunca lado a lado na mesma decisão. O cliente pode realizar os dois, mas como ações de compra distintas.
5. **Prazo de encomenda sempre conservador.** O prazo do pedido de encomenda é sempre calculado assumindo produção do zero, independentemente de a OT já ter ou não estoque pronto do produto. Se, na prática, uma OT entregar mais rápido por já ter estoque disponível, isso é uma decisão operacional da própria OT — não é modelado, otimizado nem prometido pelo sistema.
6. **Granularidade da capacidade.** A capacidade de produção é sempre declarada por produto e por OT — nunca de forma genérica por OT nem agregada por produto —, na mesma granularidade já usada para o controle de estoque em `inventory`.
7. **Capacidade como taxa contínua, não como balde mensal.** A capacidade declarada representa um ritmo de produção (unidades/mês), não uma cota que se esgota e reinicia a cada mês corrido. Cada OT mantém uma fila (backlog) de compromissos, e a data de disponibilidade de uma nova fatia é sempre "fim da fila atual + tempo de produção da própria fatia", resolvendo pedidos maiores que a capacidade de um único mês sem regra especial adicional.
8. **Sem limite de fatiamento entre OTs (somente dentro da encomenda).** Um pedido de encomenda pode ser dividido entre quantas OTs forem necessárias para atendê-lo, não havendo número máximo de fatias, em nenhum dos dois modos de simulação.
9. **Duas simulações sempre completas, escolha única para o pedido de encomenda inteiro.** Toda simulação de um pedido de encomenda deve obrigatoriamente calcular e apresentar as duas opções completas — modo custo e modo prazo — antes de o cliente decidir. O cliente escolhe uma delas para todo o pedido de encomenda; não é permitido misturar fatias vindas de planos diferentes.
10. **Paralelização no modo prazo.** No modo prazo, o sistema pode dividir a produção entre várias OTs em paralelo com o objetivo explícito de minimizar a data de entrega final do pedido de encomenda. Como o prazo de frete é medido em dias úteis e a duração de produção em dias corridos, ambos devem ser convertidos para uma base comum antes de somados, e o resultado deve ser tratado como estimativa, não garantia contratual.
11. **Prazo sempre detalhado por remessa/OT.** O prazo de um pedido de encomenda nunca é apresentado como uma data única consolidada; toda exibição de prazo deve discriminar cada remessa por OT, quantidade e datas estimadas de disponibilidade e entrega.
12. **Reserva temporária de capacidade com TTL.** Durante o checkout de um pedido de encomenda, a fatia de capacidade alocada fica reservada por um prazo determinado (TTL), no mesmo padrão já existente para a reserva de estoque pronto. A data de disponibilidade estimada é congelada no momento da reserva; reservas não confirmadas dentro do TTL expiram e liberam a fatia de volta para a fila.
13. **Migração da fonte de verdade do estoque.** O estoque de pronta entrega deixa de ser controlado por `transformation_workshop_product.quantity` (fonte legada) e passa a ser controlado por `inventory` (ledger de entradas e saídas) — isso afeta somente o fluxo de Pronta Entrega. `transformation_workshop_product.quantity` deixa de ser escrito a partir da entrada em vigor desta feature, permanecendo congelado durante um período de transição antes de sua remoção definitiva. Ao cadastrar uma nova associação produto+OT, o sistema passa a criar automaticamente a linha correspondente em `inventory` (zerada) e em `production_capacity` (inativa).
14. **Correção obrigatória de dois problemas pré-existentes, aplicando-se aos dois fluxos.**
    - **Lock de concorrência nas reservas** — toda operação de "verificar disponibilidade → reservar" (estoque em `inventory` no fluxo de pronta entrega, ou capacidade de produção/fila no fluxo de encomenda) deve usar um lock explícito por par (OT, produto), impedindo overselling por reservas concorrentes.
    - **Cálculo de frete com dimensões reais do produto** — a cotação de frete deve usar as dimensões e o peso reais de cada produto, em vez de valores genéricos fixos, em ambos os fluxos.

## Critérios de aceite

### Cenário 1 — Cliente compra só o que está disponível como Pronta Entrega

**Dado** que uma escola adiciona ao carrinho 50 unidades de um produto cujo estoque agregado disponível é de 20 unidades,
**quando** ela finaliza um Pedido de Pronta Entrega,
**então** o sistema deve limitar a quantidade comprável a 20 unidades (o disponível agora),
**e** não deve oferecer, dentro deste mesmo pedido, nenhuma opção de completar as 30 unidades restantes por produção.

### Cenário 2 — Cliente abre um Pedido de Encomenda separado

**Dado** que a mesma escola quer completar sua necessidade além do que comprou em pronta entrega,
**quando** ela acessa a jornada separada de Encomenda e informa a quantidade desejada (por exemplo, 30 unidades, ou as 50 completas),
**então** o sistema deve tratar essa quantidade inteiramente como produção nova, sem consultar o estoque pronto atual,
**e** deve apresentar as duas simulações completas (custo e prazo), cada uma fatiando a quantidade entre as OTs com capacidade ativa (por exemplo, OT A com 35/mês e OT B com 15/mês) conforme o modo.

### Cenário 3 — Os dois pedidos nunca se combinam

**Dado** um cliente que deseja comprar mais do que o estoque disponível,
**quando** ele interage com o sistema,
**então** em nenhum momento deve ser apresentada uma tela ou fluxo que combine, num único pedido, itens de pronta entrega e itens de encomenda,
**e** eventual compra dos dois tipos deve resultar sempre em dois pedidos distintos.

### Cenário 4 — Simulação de encomenda sempre retorna as duas opções (custo e prazo)

**Dado** um pedido de encomenda com qualquer quantidade desejada,
**quando** o cliente solicita a simulação,
**então** a resposta deve conter obrigatoriamente um plano de modo custo e um plano de modo prazo, cada um com custo total e prazo máximo calculados,
**e** o cliente deve poder escolher um único modo para o pedido de encomenda inteiro.

### Cenário 5 — Produto sem nenhuma OT com capacidade retorna aviso explícito

**Dado** um produto que não possui nenhuma OT com `production_capacity` ativa cadastrada,
**quando** o cliente tenta abrir um pedido de encomenda para esse produto,
**então** o sistema deve informar explicitamente que não é possível atender o pedido no momento, em vez de falhar de forma genérica ou silenciosa.

### Cenário 6 — Reserva de capacidade expira e libera a fila para outro cliente

**Dado** que um cliente iniciou o checkout de um pedido de encomenda e o sistema criou uma reserva temporária de capacidade com TTL,
**quando** o TTL expira sem que o checkout seja concluído,
**então** a reserva deve expirar automaticamente e a fatia de capacidade deve voltar a ficar disponível na fila,
**e** um segundo cliente que simule uma encomenda para o mesmo par (OT, produto) deve conseguir reservar essa mesma fatia, com a data recalculada a partir da fila liberada.

### Cenário 7 — Modo prazo paraleliza produção entre OTs para reduzir o prazo final

**Dado** uma quantidade de encomenda que pode ser dividida entre duas ou mais OTs com capacidades e filas diferentes,
**quando** o cliente simula no modo prazo,
**então** o sistema deve poder fatiar a quantidade entre múltiplas OTs simultaneamente sempre que isso resultar em uma data de entrega final menor do que atribuir tudo a uma única OT.

### Cenário 8 — Prazo de encomenda exibido detalhado por remessa/OT, nunca como data única

**Dado** um pedido de encomenda resultante de uma simulação com múltiplas remessas,
**quando** o cliente consulta o prazo do pedido em qualquer tela ou resposta de API,
**então** o sistema deve exibir o prazo discriminado por remessa/OT, com quantidade e datas estimadas,
**e** não deve existir uma data única consolidada que oculte a existência de múltiplas remessas.

### Cenário 9 — Lock de concorrência evita overselling em reservas simultâneas

**Dado** um mesmo par (OT, produto) com estoque ou capacidade de produção limitados,
**quando** duas reservas para esse mesmo par são solicitadas de forma concorrente,
**então** o sistema deve garantir, por meio de lock explícito, que apenas uma das reservas seja aceita além do limite disponível.

### Cenário 10 — Frete calculado com dimensões reais do produto

**Dado** um produto com largura, altura, comprimento e peso cadastrados,
**quando** o sistema calcula o frete para qualquer um dos dois fluxos (pronta entrega ou encomenda),
**então** a cotação de frete deve usar as dimensões e o peso reais do produto, não valores genéricos fixos.

## Definição funcional de pronto

- Todos os requisitos funcionais (RF-01 a RF-11) foram implementados e validados.
- Todas as 14 regras de negócio, incluindo a separação total entre os dois tipos de pedido, a migração da fonte de verdade do estoque e a correção dos dois bugs pré-existentes, foram implementadas e verificadas.
- O cenário motivador da escola (50 unidades desejadas, 20 em estoque, OTs com 35/mês e 15/mês) resulta em dois pedidos distintos e independentes quando o cliente decide realizar ambos.
- A simulação de qualquer pedido de encomenda retorna sempre as duas opções completas (custo e prazo), nunca uma única alternativa.
- Um produto sem nenhuma OT com capacidade cadastrada e ativa retorna aviso explícito de indisponibilidade na jornada de encomenda.
- A reserva de capacidade de produção expira corretamente ao fim do TTL e libera a fila para outros clientes, com teste de reserva concorrente validando o lock.
- O prazo do pedido de encomenda é exibido detalhado por remessa/OT em todas as telas e respostas de API pertinentes, sem data única consolidada.
- A migração de `transformation_workshop_product` para `inventory` foi executada sem perda de dados e passou a ser usada em todos os pontos de integração do fluxo de Pronta Entrega.
- E-mails de pedido e a tela de pedidos da OT foram validados manualmente, indicando claramente o tipo (Pronta Entrega ou Encomenda) de cada pedido.
- Evidências de teste (simulação de encomenda, reserva, concorrência, frete) foram registradas.
