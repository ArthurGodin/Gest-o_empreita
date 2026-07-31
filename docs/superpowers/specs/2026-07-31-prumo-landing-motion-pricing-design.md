# Prumo: movimento da landing e precos com profundidade

## Objetivo

Elevar a percepcao de qualidade da landing e da pagina de precos sem alterar
regras comerciais, checkout, analytics, textos de plano ou comportamento do
produto. O resultado deve parecer mais vivo e intencional, mantendo a clareza
operacional, a leveza no celular e a identidade visual atual do Prumo.

## Direcao escolhida

A referencia recebida sera adaptada, nao copiada. O Prumo usara a profundidade,
o destaque hierarquico e o ritmo de entrada do exemplo, preservando o fundo
claro, o verde da marca, os cantos moderados e a densidade atual.

Foram consideradas tres abordagens:

1. Glassmorphism escuro completo. Tem alto impacto visual, mas destoa da landing,
   reduz a legibilidade e aproxima o produto de uma estetica generica de showcase.
2. Somente microinteracoes nos componentes atuais. Tem risco baixo, mas nao cria
   uma mudanca perceptivel suficiente na secao de precos.
3. Profundidade operacional adaptada. Mantem o Prumo reconhecivel e usa vidro,
   luz, contraste e movimento apenas onde ajudam a hierarquia. Esta e a abordagem
   escolhida.

## Pagina de precos

- A estrutura continua com os planos Gratis, Pro e Ultimate e usa exclusivamente
  `PLAN_DEFINITIONS` como fonte de nome, preco, descricao, CTA e recursos.
- O Pro permanece como recomendacao comercial e ganha maior profundidade,
  contraste escuro, uma borda luminosa discreta e resposta suave ao ponteiro em
  dispositivos que suportam hover.
- Gratis e Ultimate usam superficies claras semitransparentes sobre uma base
  neutra. O efeito de vidro sera leve, com bordas visiveis e contraste AA.
- Os cards entram em sequencia quando a grade aparece. A animacao usa apenas
  `transform` e `opacity`, ocorre uma vez e nao muda a altura da pagina.
- Os precos usam numeros tabulares para evitar oscilacao visual. Nao sera criado
  seletor mensal/anual, pois o Prumo atualmente vende apenas planos mensais.
- CTAs preservam seus destinos e eventos de analytics. Hover e pressao terao
  feedback entre 150 e 250 ms, sem deslocar os limites do botao.
- No celular, os cards permanecem em uma coluna, sem efeitos dependentes de hover,
  com alvos de toque de pelo menos 44 px e sem rolagem horizontal.

## Landing

- Cabecalho, texto principal, CTAs e indicadores entram em uma sequencia curta na
  primeira exibicao. O conteudo continua visivel durante SSR e sem JavaScript.
- A imagem principal do sistema recebe uma entrada curta com escala minima e
  deslocamento vertical leve. Depois da entrada ela fica estavel.
- Indicadores de status podem ter um pulso de baixa amplitude e baixa frequencia,
  limitado a elementos que comunicam estado ativo ou aprovado.
- Secoes e grupos de cards abaixo da dobra aparecem conforme entram no viewport.
  A revelacao ocorre uma vez, em pequenos grupos, para nao cansar durante o scroll.
- Botoes recebem microinteracoes de hover, foco e pressao coerentes com o design
  atual. Nenhuma acao espera a animacao terminar para navegar.
- O movimento deve reforcar a leitura: primeiro mensagem, depois prova do produto,
  depois detalhes. Nao serao adicionados blobs, orbes, fundos animados ou loops
  decorativos.

## Arquitetura

- A landing e a pagina de precos continuam server components para preservar SEO,
  HTML inicial e tempo de carregamento.
- Um componente cliente pequeno e reutilizavel controla revelacoes por viewport
  com Framer Motion. Ele aceita variantes simples para grupo, item e destaque.
- Efeitos que nao precisam de estado, como hover e pressao, ficam em CSS/Tailwind.
- A logica comercial continua fora dos componentes de movimento. Nenhum dado de
  plano e duplicado no frontend visual.

## Acessibilidade e desempenho

- `prefers-reduced-motion: reduce` remove deslocamentos, escalas, pulsos e
  transicoes nao essenciais.
- Animacoes de entrada duram no maximo 400 ms; microinteracoes ficam entre 150 e
  250 ms.
- So `transform` e `opacity` serao animados, evitando reflow e layout shift.
- Elementos interativos mantem foco visivel, ordem de teclado e semantica nativa.
- A imagem LCP preserva `priority`, dimensoes declaradas e seu espaco reservado.
- A implementacao sera verificada em 375 px, 768 px e desktop, incluindo modo de
  movimento reduzido.

## Fora de escopo

- Alterar precos, beneficios, limites, recorrencia ou checkout.
- Criar cobranca anual ou desconto que o produto nao oferece.
- Mudar a identidade visual do app interno.
- Adicionar novas bibliotecas de animacao.
- Reescrever textos comerciais sem necessidade de legibilidade.

## Validacao

- Typecheck, lint, testes e build do projeto web.
- QA visual da landing e de `/precos` em celular e desktop.
- Verificacao de ausencia de rolagem horizontal e layout shift perceptivel.
- Verificacao de navegacao dos CTAs e preservacao dos atributos de analytics.
- Verificacao manual ou automatizada com `prefers-reduced-motion` ativado.

## Criterio de aceite

A mudanca e aprovada quando a pagina de precos lembra a sofisticacao da referencia
sem deixar de parecer Prumo, a landing tem movimento perceptivel mas discreto, os
CTAs e promessas continuam fieis e ambas as paginas permanecem rapidas, legiveis e
confortaveis em celular.
