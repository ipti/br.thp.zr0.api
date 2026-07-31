# TASK-07 - Frete com dimensoes reais do produto no calculo do Melhor Envio

## Metadados

- **Prioridade:** P1
- **Status:** Não iniciada
- **Dependências:** Nenhuma
- **Bloqueia:** TASK-09

## Objetivo

Eliminar o uso de dimensões genéricas de embalagem (20×20×20 cm / 1 kg) no cálculo de frete via Melhor Envio, substituindo-as pelas dimensões reais do produto (`product.width/height/length/weight`, campos `Float` já existentes em `prisma/schema.prisma:179-182`) em **todos** os caminhos de cotação, não apenas no caminho que hoje já faz isso corretamente. Isso é um dos dois bugs pré-existentes que o plano de "Compra por Encomenda" decide corrigir junto com a feature (ver plano, seção "Contexto", item 10, e seção "Correções de bugs pré-existentes incluídas nesta entrega", item 2), porque a precisão do frete por OT alimenta diretamente o critério de custo das duas simulações (modo custo e modo prazo) que serão implementadas na TASK-04.

## Escopo

- Corrigir o método `calculatePrice` de `MeuEnvioShippingStrategy` (`src/shipping/strategies/meu-envio-shipping.strategy.ts:63-97`), que hoje recebe `altura`, `largura`, `comprimento` e `peso` como parâmetros opcionais com defaults fixos (`= 20, = 20, = 20, = 1`, linhas 66-69) e é chamado sem esses argumentos em `src/shipping/shipping.service.ts:52-55` — ou seja, **sempre** cota com a caixa genérica, independentemente do produto.
- Passar a origem real das dimensões (registro `product` já carregado em `shipping.service.ts:26-28`) para essa chamada.
- Investigar e decidir sobre a duplicidade de lógica entre `calculatePrice` (payload `package` singular, usado só para ranquear OTs por preço, `shipping.service.ts:50-67`) e `calculate` (payload `products[]`, usado para montar a cotação final do frete, `shipping.service.ts:80-107`, via `buildShippingContext`, `shipping.service.ts:112-133`) — esse último **já usa** as dimensões reais do produto (linhas 125-128) e é a evidência de que o bug está isolado no primeiro caminho.
- Garantir que `delivery_time` (hoje descartado em `calculatePrice`, que só extrai `price` em `meu-envio-shipping.strategy.ts:93-96`) fique disponível para uso futuro do modo prazo (TASK-04), já que o plano (linha 35) prevê estender `calculatePrice()` para também devolver `delivery_time`.
- **Fora do escopo desta task:** o algoritmo de simulação do Pedido de Encomenda em si (TASK-04, custo/prazo/multi-OT); o valor fixo de `insuranceValue: 0` em `shipping.service.ts:129` (comentário já existente "ajustar se precisar baseado no subtotal ou preço") — é um problema correlato de "valor genérico no payload", mas não está entre os dois bugs que o plano lista para esta entrega; qualquer alteração de schema (não há campo novo necessário, os campos já existem no `product`).

## Arquivos previstos

- `src/shipping/strategies/meu-envio-shipping.strategy.ts` — método `calculatePrice` (linhas 63-97) e, se a consolidação do passo 4 for adotada, também `calculate` (linhas 17-61) e `parseShippingApiResponse` (linhas 99-118).
- `src/shipping/shipping.service.ts` — laço de montagem de `quantity_tw` e chamada a `calculatePrice` (linhas 50-65), `buildShippingContext` (linhas 112-133) se reaproveitado.
- `src/shipping/entities/shipping-context.entity.ts` — interface `ProductForShipping` (linhas 1-9), possivelmente reaproveitada na nova assinatura de `calculatePrice`.
- `src/shipping/entities/shipping-result.entity.ts` — `ShippingRate`/`ShippingCalculationResult` (linhas 1-15), caso o retorno de `calculatePrice` passe a incluir `deliveryTime`.
- `src/shipping/shipping.service.spec.ts` — hoje é apenas um stub (`should be defined`, linhas 15-17); precisa ganhar cobertura real para este cenário.
- `src/shipping/strategies/meu-envio-shipping.strategy.spec.ts` — arquivo novo (não existe hoje); único teste de estratégia no módulo hoje é `shipping.controller.spec.ts`, que não cobre `MeuEnvioShippingStrategy`.
- `prisma/schema.prisma` (linhas 169-194, especificamente `weight/height/width/length` em 179-182) — leitura/referência, sem alteração de schema nesta task.

## Passos de implementação

1. Alterar a assinatura de `calculatePrice(fromCep, toCep, altura = 20, largura = 20, comprimento = 20, peso = 1)` (`meu-envio-shipping.strategy.ts:63-70`) para receber as dimensões reais como parâmetros obrigatórios (ou um objeto único `{ width, height, length, weight }`, mais alinhado com `ProductForShipping` de `shipping-context.entity.ts:1-9`), removendo os defaults fixos de caixa genérica.
2. Atualizar a chamada em `shipping.service.ts:52-55` (dentro do `.map` que monta `quantity_tw`, linhas 50-65) para passar `product.width`, `product.height`, `product.length`, `product.weight` — o objeto `product` já foi carregado em `shipping.service.ts:26-28` e está disponível no escopo do laço `for (const orderItems of dto.orderItems)`.
3. Definir e implementar fallback explícito para dimensões ausentes/zeradas: o schema define `width/height/length/weight` como `Float` não-nulo (`schema.prisma:179-182`), mas produtos cadastrados antes da obrigatoriedade podem ter `0` gravado — logar aviso e usar um valor mínimo aceito pela API do Melhor Envio em vez de deixar a cotação falhar silenciosamente ou retornar preço `0` (mesma filosofia de "alertar mas não travar" que o plano usa para `production.date_end null`, seção "Riscos e pontos de atenção").
4. Avaliar e documentar a consolidação de `calculatePrice` e `calculate`: os dois métodos chamam o mesmo endpoint (`${MELHOR_ENVIO_API_URL}/api/v2/me/shipment/calculate`, linhas 84 e 38 respectivamente) com payloads distintos (`package` vs `products[]`) e propósitos sobrepostos (ranquear por preço vs. montar cotação final). Essa duplicação é a causa raiz do bug — um caminho recebeu dimensões reais (`buildShippingContext`), o outro não. Duas opções:
   - (a) Fazer `calculatePrice` delegar para `calculate`/`buildShippingContext` e extrair `bestOption.cost`, eliminando a duplicação de payload/lógica; ou
   - (b) Manter os dois métodos separados, mas garantir que ambos recebam sempre as dimensões reais do produto sendo cotado.
   Registrar a decisão tomada no PR, já que a TASK-04 vai construir o algoritmo de simulação em cima de um desses dois caminhos.
5. Se a opção (a) do passo 4 for adotada, ajustar o laço de ranqueamento em `shipping.service.ts:50-65` para reaproveitar `buildShippingContext` (linhas 112-133) em vez de uma segunda chamada HTTP com payload próprio, cuidando para não duplicar chamadas de rede por OT sem necessidade.
6. Incluir `delivery_time` no retorno de `calculatePrice` (hoje descartado — `meu-envio-shipping.strategy.ts:93-96` só faz `response?.data?.find((item) => item.price)?.price`), pois o plano (linha 35) prevê essa extensão como pré-requisito do modo prazo da TASK-04; sem isso, o modo prazo herdaria o mesmo tipo de bug (dado descartado) em outro lugar.
7. Ajustar o tipo de retorno de `calculatePrice` (hoje `Promise<number>`, implícito pelo `return preco` em `meu-envio-shipping.strategy.ts:96`) para acomodar `deliveryTime` junto do preço, sem quebrar o único call-site atual (`shipping.service.ts:52`, confirmado por busca — não há outro consumidor no repositório).
8. Deixar registrado como débito técnico (sem corrigir nesta task) o `insuranceValue`/`insurance_value` fixado em `0` em `shipping.service.ts:129` e `meu-envio-shipping.strategy.ts:33` — mesmo padrão de "valor genérico no payload", mas fora do escopo definido pelo plano para esta entrega.
9. Escrever testes unitários para `meu-envio-shipping.strategy.ts` (arquivo novo `meu-envio-shipping.strategy.spec.ts`) mockando `axios.post` e verificando que o payload enviado contém as dimensões reais recebidas como argumento, não os valores genéricos antigos.
10. Atualizar/expandir `shipping.service.spec.ts` (hoje só `should be defined`) para cobrir o laço `quantity_tw`/`ordenadoPorPreco` (`shipping.service.ts:50-67`), garantindo que a ordenação por preço (`algothmsMoneyShipping`, linhas 134-158) reflita cotações calculadas com as dimensões do produto sob teste.
11. Rodar uma consulta rápida (`npx prisma studio` ou query direta) nos produtos existentes para confirmar que `width/height/length/weight` estão populados com valores plausíveis antes de assumir, em produção, que o valor real é sempre superior ao genérico.

## Critérios de aceite

- Nenhuma chamada ao Melhor Envio para cotar o frete de um produto específico usa 20×20×20 cm / 1 kg quando o produto tem dimensões cadastradas — nem no caminho de ranqueamento (`calculatePrice`), nem no caminho de cotação final (`calculate`).
- O payload HTTP enviado por `calculatePrice` reflete `product.width/height/length/weight` do produto sendo cotado em `shipping.service.ts:52-55`.
- A ordenação por custo (`ordenadoPorPreco`, `shipping.service.ts:67`), consumida por `algothmsMoneyShipping` (linhas 134-158), passa a refletir o custo real de frete por OT para aquele produto específico, e não um custo idêntico para qualquer produto.
- `delivery_time` está disponível no retorno relevante (de acordo com a decisão do passo 4/6), pronto para ser consumido pela TASK-04 no modo prazo, sem quebrar o contrato atual do endpoint `POST /shipping/calculate` (`shipping.controller.ts:8-11`).
- Produtos sem dimensões válidas geram log de aviso, não falha silenciosa nem preço `0` inadvertido.
- Testes unitários novos/atualizados (`meu-envio-shipping.strategy.spec.ts`, `shipping.service.spec.ts`) cobrindo o payload com dimensões reais estão passando.
- Nenhuma regressão no único call-site existente de `calculatePrice` (`shipping.service.ts:52`) nem no endpoint público `POST /shipping/calculate`.

## Validação

- Rodar a suíte de testes do módulo (`npm test -- shipping` ou equivalente do projeto), incluindo os testes novos de `meu-envio-shipping.strategy.spec.ts` e a expansão de `shipping.service.spec.ts`.
- Chamar `POST /shipping/calculate` (`shipping.controller.ts:8-11`) manualmente para dois produtos com dimensões bem diferentes (ex.: um produto pequeno/leve vs. um grande/pesado) e o mesmo par de CEPs, confirmando que os preços retornados agora divergem de forma coerente — hoje, por causa do bug, tenderiam a ser calculados com a mesma caixa genérica no caminho de ranqueamento.
- Inspecionar (via log temporário, debugger ou interceptação de rede) o payload efetivamente enviado à API do Melhor Envio em `calculatePrice`, confirmando `width/height/length/weight` reais em vez de `20/20/20/1`.
- Comparar o resultado de `algothmsMoneyShipping` (ordem de OTs escolhida) antes/depois da correção para um cenário com OTs de custo-base parecido mas cujo frete real diverge por causa do peso/dimensão do produto — confirmar que a ordem muda quando esperado.
- Rodar lint (`npm run lint`) e build (`npm run build`) do projeto para garantir que a mudança de assinatura de `calculatePrice` não quebra nenhum outro call-site (confirmado nesta análise: hoje só existe um, em `shipping.service.ts:52`).
- Se a consolidação do passo 4 (opção a) for adotada, medir manualmente o tempo de resposta de `POST /shipping/calculate` antes/depois para um carrinho com múltiplas OTs candidatas, garantindo que não houve regressão de latência perceptível.

## Riscos

- Produtos legados com `width/height/length/weight` zerados ou inconsistentes (o schema não tem `@default`, mas cadastros antigos podem ter sido gravados com `0` ou valores placeholder) podem gerar cotações inválidas, rejeitadas pela API do Melhor Envio, ou artificialmente baratas/caras.
- Mudar a assinatura de `calculatePrice` é uma alteração de contrato interno; hoje há apenas um call-site (`shipping.service.ts:52`), mas a TASK-04 (endpoint de simulação do Pedido de Encomenda, custo/prazo) vai depender diretamente deste método (ou do resultado da consolidação do passo 4) — a mudança de contrato precisa ser comunicada a quem implementar a TASK-04 em seguida.
- Se a consolidação de `calculatePrice`/`calculate` (passo 4/5) for mal desenhada, pode introduzir uma chamada HTTP adicional por OT no laço de ranqueamento (`shipping.service.ts:50-65`), aumentando a latência de `POST /shipping/calculate` proporcionalmente ao número de OTs candidatas por produto.
- A API do Melhor Envio pode se comportar de forma diferente (erro, preço, serviços disponíveis) para dimensões reais maiores/mais pesadas do que a caixa genérica de 20×20×20 cm/1 kg — por exemplo, alguns serviços de transporte podem não aceitar certos volumes; o tratamento de erro por serviço hoje se limita ao filtro `error == null` (`meu-envio-shipping.strategy.ts:54`), sem lógica adicional para esse cenário.
- Sem esta correção, tanto o fluxo de Pronta Entrega (que reusa a lógica de `algothmsMoneyShipping`) quanto o modo custo do Pedido de Encomenda (TASK-04) herdariam silenciosamente o mesmo bug no critério de custo — por isso esta task bloqueia a TASK-09 (validação end-to-end dos dois fluxos), que depende de custos de frete corretos para validar os planos de custo/prazo.

## Mitigação

- Adicionar validação e log de alerta (sem bloquear a simulação) sempre que `width/height/length/weight` vier zerado, nulo ou fora de uma faixa plausível, antes de montar o payload para o Melhor Envio.
- Durante a transição, manter compatibilidade temporária: se for inevitável, aceitar os parâmetros antigos como opcionais com os valores atuais como fallback, mas emitindo log quando o fallback for usado — até confirmar que todos os call-sites atuais e os que a TASK-04 introduzir passam dimensões reais.
- Se a consolidação (passo 4, opção a) for adotada, usar `Promise.all` (já é o padrão em `shipping.service.ts:50-65`) para paralelizar as chamadas por OT e evitar regressão de performance perceptível.
- Cobrir com testes unitários (passo 9/10) os casos de dimensão zerada/ausente e de dimensões reais divergentes por produto, para travar o comportamento esperado e evitar reintrodução do bug em refatorações futuras.
- Documentar no PR a decisão tomada no passo 4 (consolidar ou manter os dois métodos) e o formato final de retorno de `calculatePrice` (com ou sem `deliveryTime`), para que a implementação da TASK-04 comece com esse contrato já claro.