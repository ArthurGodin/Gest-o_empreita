# Prumo UX/UI - Lote 3A: detalhe da obra

## Contexto

O detalhe da obra concentra o valor operacional do Prumo depois da aprovacao de um orcamento. A tela atual ja entrega status, etapas, cobranca, diario, custos, ponto da equipe e link publico, mas exige uma rolagem longa e apresenta secoes de importancia diferente com peso visual parecido.

Este lote refina a hierarquia e a navegacao desse fluxo sem reescrever os modulos internos nem alterar regras de negocio. Ele segue a direcao `operacional premium` aprovada para o produto: informacao primeiro, densidade media, controles previsiveis e composicao mobile propria.

## Objetivo

Permitir que o usuario:

1. entenda rapidamente o estado da obra;
2. encontre qualquer area operacional sem percorrer a pagina inteira;
3. diferencie acoes de execucao, registro e cobranca;
4. opere confortavelmente no celular com uma mao;
5. continue usando exatamente os mesmos dados e acoes existentes.

## Nao objetivos

Este lote nao inclui:

- alteracao de schema, RLS, consultas ou server actions;
- mudanca de calculos de progresso, margem, custos, horas ou cobranca;
- alteracao do fluxo Asaas, Pix, baixa manual ou protecao do saldo;
- criacao de novos status, campos ou permissoes;
- mudanca de limites dos planos;
- alteracao do link publico ou do PDF;
- uso de abas que escondam secoes;
- redesenho interno completo dos dialogs de cada modulo;
- editor de orcamento, formularios ou configuracoes, que ficam no Lote 3B.

## Abordagem escolhida

### Hierarquia cirurgica com navegacao local

Todas as secoes continuam renderizadas na pagina e na ordem operacional atual. Uma navegacao local permite saltar para cada area por ancora, sem manter estado paralelo e sem esconder funcionalidades.

Alternativas descartadas:

- abas: encurtariam visualmente a pagina, mas esconderiam modulos e reduziriam a descoberta de recursos;
- wizard: imporia uma sequencia artificial a tarefas que podem acontecer em qualquer ordem;
- reconstrucao completa: aumentaria o risco funcional sem retorno proporcional antes das vendas.

## Arquitetura da experiencia

### 1. Cabecalho da obra

O cabecalho mantem:

- retorno para a lista de obras;
- nome da obra como titulo principal;
- endereco, cliente e data de inicio;
- status atual com texto e cor;
- acao de mudar status.

O texto e os metadados devem quebrar naturalmente em telas estreitas. Icones decorativos recebem `aria-hidden`. O controle de status preserva comportamento, dialogs e confirmacoes atuais.

### 2. Navegacao local

A navegacao apresenta cinco destinos:

1. Etapas;
2. Cobranca;
3. Diario;
4. Custos;
5. Equipe.

No mobile, um seletor compacto de 44 px permite escolher a secao sem criar uma faixa horizontal rolavel. No desktop, os destinos aparecem como links compactos na mesma linha.

Cada destino aponta para uma ancora real na pagina. A URL recebe o hash correspondente, permitindo link direto e comportamento nativo de voltar/avancar. O scroll respeita a topbar e a propria navegacao por meio de `scroll-margin`.

A navegacao pode permanecer sticky enquanto o usuario percorre a obra, desde que:

- nao cubra titulo, campos, dialogs ou feedback;
- respeite topbar e safe area no mobile;
- use fundo opaco suficiente para manter leitura;
- nao altere geometria ao mudar o destino.

### 3. Hierarquia das secoes

As secoes permanecem nesta ordem:

1. sugestao contextual de status, quando existir;
2. etapas;
3. cobranca;
4. diario e custos;
5. ponto da equipe;
6. link publico.

Etapas e cobranca continuam como areas de maior importancia. Diario e custos podem compartilhar uma grade no desktop, mas permanecem em coluna unica no mobile. Ponto da equipe fica abaixo dos registros financeiros e operacionais. O link publico permanece no final como recurso secundario.

Cada secao navegavel recebe:

- `id` estavel;
- titulo semantico;
- `scroll-margin` responsiva;
- icone decorativo oculto de leitores de tela quando aplicavel;
- foco e alvos de toque consistentes nas acoes.

### 4. Densidade e composicao

- Manter raio maximo de 8 px nas superficies.
- Usar espacamento de 12 a 16 px no mobile e 16 a 20 px no desktop.
- Evitar novos cards dentro de cards.
- Manter listas de etapas, custos e horas compactas.
- Preservar valores financeiros com `tabular-nums`.
- Nao transformar cabecalhos de secao em blocos promocionais.
- Nao adicionar animacao decorativa; o salto entre secoes usa comportamento nativo ou movimento reduzido quando solicitado pelo sistema.

## Componentes

### `ProjectSectionNav`

Componente cliente pequeno e isolado, responsavel apenas por:

- renderizar seletor mobile e links desktop;
- navegar para uma ancora conhecida;
- atualizar o hash da URL;
- respeitar `prefers-reduced-motion` ao decidir o comportamento do scroll;
- manter nomes acessiveis dos controles.

Ele nao busca dados, nao altera a obra e nao conhece server actions.

### Secoes existentes

`StagesSection`, `BillingSection`, `DiarySection`, `CostsSection` e `TimeSection` preservam suas props e suas regras. O lote pode adicionar `id`, classes de scroll e pequenos ajustes de cabecalho/acessibilidade, mas nao muda contratos de dados.

### `ProjectHeader`

Mantem a assinatura atual sempre que possivel. Ajustes ficam limitados a markup, quebra responsiva, iconografia e nomes acessiveis.

## Dados e comportamento

O `ProjectDetailPage` continua carregando os mesmos dados em paralelo por `getProjectWithRelations` e `listTemplates`. A navegacao local e derivada de uma lista estatica de secoes e nao depende do banco.

O hash da URL nao participa de consultas, cache ou server rendering. A query `cobranca=atencao` continua funcionando sem alteracao e pode coexistir com o hash.

Nenhuma acao existente muda de nome funcional, payload, permissao ou sequencia de confirmacao.

## Estados e erros

- Secoes vazias continuam exibindo suas acoes atuais.
- Erros permanecem proximos da acao responsavel.
- A navegacao local continua disponivel quando uma secao esta vazia.
- Destino de hash desconhecido nao causa erro e mantem a pagina no topo.
- Sem JavaScript, links desktop continuam navegando por ancoras nativas; o seletor mobile depende de JavaScript apenas para a troca de destino.
- Dialogs continuam controlando foco pelo componente compartilhado existente.

## Responsividade

### 375 x 812 e 390 x 844

- cabecalho em coluna;
- botao de status com alvo minimo de 44 px;
- seletor de secao em largura total;
- secoes em coluna unica;
- conteudo nao fica sob a bottom navigation;
- nenhum overflow horizontal.

### 768 x 1024

- cabecalho pode distribuir titulo e acao em linha;
- navegacao desktop pode aparecer se todos os destinos couberem sem truncamento;
- diario e custos podem permanecer em coluna quando a leitura ficar melhor.

### 1440 x 900

- container e sidebar existentes sao preservados;
- navegacao local em linha;
- diario e custos em grade assimetrica atual;
- linhas e valores mantem alinhamento previsivel.

## Acessibilidade

- Todos os destinos da navegacao possuem texto visivel.
- O seletor mobile possui label acessivel.
- O destino selecionado usa `aria-current` quando aplicavel.
- Foco visivel em links, botoes e seletor.
- Icones decorativos recebem `aria-hidden`.
- Cor nao e o unico indicador de status.
- Alvos de toque possuem no minimo 44 x 44 px.
- Zoom do navegador permanece habilitado.

## Estrategia de implementacao

1. Criar a lista tipada de secoes e `ProjectSectionNav`.
2. Integrar a navegacao no detalhe sem alterar os modulos.
3. Adicionar ancoras e scroll margin nas secoes.
4. Refinar cabecalho, iconografia e densidade somente onde houver problema comprovado.
5. Adicionar teste E2E do detalhe com dados de demonstracao.
6. Executar QA visual nos quatro viewports de referencia.
7. Revisar o diff para confirmar ausencia de mudanca funcional.

## Validacao

- typecheck;
- lint;
- testes unitarios existentes;
- build de producao;
- E2E com workspace temporario e kit demonstrativo;
- navegacao para as cinco ancoras;
- query de atencao de cobranca preservada;
- ausencia de overflow horizontal;
- screenshots em 375, 390, 768 e 1440 px;
- smoke test de login, precos e producao depois do deploy;
- CI completo com Supabase e jornadas no navegador.

## Criterios de aceite

1. O usuario alcanca qualquer area da obra em uma acao clara.
2. Nenhuma secao ou funcao existente fica escondida.
3. A pagina continua representando corretamente status, etapas, cobranca, diario, custos e horas.
4. A navegacao local funciona com teclado, toque e URL.
5. Nenhum viewport de referencia apresenta zoom inicial, overflow ou conteudo coberto.
6. Pagamento, baixa, status, calculos, permissoes e link publico permanecem inalterados.
7. Testes, build, E2E, CI e QA visual ficam verdes.
