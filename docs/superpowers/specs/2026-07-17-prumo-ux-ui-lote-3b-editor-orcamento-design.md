# Prumo UX/UI - Lote 3B: editor de orcamento protegido

## Contexto

O editor de orcamento e o principal fluxo comercial do Prumo. Ele ja cria, precifica, salva e envia propostas pelo WhatsApp, mas ainda nao comunica com clareza se o trabalho atual esta salvo. O usuario tambem pode sair da tela com alteracoes pendentes, recebe alguns erros longe do campo responsavel e encontra informacao repetida entre a conferencia de envio e a barra inferior.

O backend atual ja oferece uma base segura: o rascunho e atualizado por uma RPC atomica, o envio valida os requisitos comerciais e orcamentos enviados permanecem imutaveis. Este lote melhora a experiencia sobre essa base sem alterar pagamentos, planos, PDFs ou regras financeiras.

## Objetivo

Permitir que o usuario:

1. saiba permanentemente se o rascunho esta salvo;
2. salve deliberadamente, inclusive enquanto o orcamento ainda esta incompleto;
3. nao perca trabalho ao fechar, recarregar ou navegar para outra tela;
4. entenda e corrija erros no campo responsavel;
5. monte itens com conforto no celular e rapidez no desktop;
6. diferencie claramente salvar um rascunho de preparar o envio ao cliente.

## Nao objetivos

Este lote nao inclui:

- autosave ou gravacao em intervalo;
- mudanca de schema, RLS, RPC ou contrato financeiro;
- alteracao de status, aprovacao, revisao ou conversao em obra;
- alteracao do WhatsApp, link publico ou PDF;
- alteracao de limites dos planos;
- alteracao do Asaas, Pix, boleto ou assinatura SaaS;
- importacao em lote, descontos, categorias ou novos campos de item;
- redesenho dos formularios de clientes, obras e configuracoes, que ficam no lote seguinte.

## Abordagem escolhida

### Salvamento explicito protegido

O editor mantem o botao Salvar como acao deliberada e passa a comparar o estado editavel com o ultimo estado confirmado pelo servidor. A interface informa quando ha alteracoes, protege a saida e atualiza a referencia somente depois de uma resposta bem-sucedida.

Alternativas descartadas:

- autosave: reduziria um clique, mas adicionaria concorrencia entre digitacao, reordenacao, salvamento de catalogo e envio;
- wizard: facilitaria a primeira proposta, mas atrasaria o usuario recorrente e esconderia a relacao entre itens, total e envio;
- reescrita do dominio: aumentaria o risco sem necessidade, pois a persistencia atomica atual ja e adequada.

## Modelo do rascunho

### Estado persistivel

Uma funcao pura produz a representacao normalizada do rascunho com:

- titulo sem espacos nas extremidades;
- descricao e observacoes normalizadas;
- cliente e validade;
- itens com descricao preenchida, unidade normalizada, quantidade e preco em centavos;
- ordem atual dos itens.

Chaves locais, estado visual e `catalog_item_id` que nao participa da RPC nao entram na comparacao. Linhas completamente vazias tambem nao entram, pois nao sao persistidas. Assim, adicionar uma linha vazia nao cria um falso estado pendente; preencher qualquer dado persistivel cria.

### Referencia salva

Ao abrir a pagina, a referencia salva e criada a partir dos dados recebidos do servidor. Depois de salvar com sucesso, ela e substituida pelo payload que o servidor confirmou. Falhas mantem a referencia anterior e o estado continua pendente.

O editor apresenta quatro estados:

1. `Salvo`;
2. `Alteracoes nao salvas`;
3. `Salvando...`;
4. `Falha ao salvar`.

O estado usa texto e icone, nunca apenas cor. O horario da ultima confirmacao pode aparecer como informacao secundaria durante a sessao, sem prometer historico persistido.

## Regras de salvamento e envio

### Salvar rascunho

- O botao Salvar fica habilitado somente quando existem alteracoes persistiveis e nenhuma operacao esta em andamento.
- Um rascunho pode ser salvo sem itens preenchidos.
- Titulo e cliente continuam obrigatorios porque fazem parte do contrato atual da server action.
- Campos opcionais podem permanecer vazios.
- Linhas vazias sao mantidas apenas como apoio visual e nao sao enviadas para a RPC.
- O salvamento continua usando `updateQuoteAction` e `replace_quote_items`.

### Enviar pelo WhatsApp

O envio continua exigindo:

- titulo;
- cliente;
- validade;
- pelo menos 1 item preenchido;
- total maior que zero.

Se o rascunho estiver alterado, `Salvar e enviar` salva primeiro. O envio so prossegue depois da confirmacao do servidor. Se o rascunho ja estiver salvo, a etapa redundante pode ser evitada sem mudar o resultado funcional.

Salvar incompleto nunca muda o status para enviado. Preparar o WhatsApp continua sendo uma acao separada e explicita.

## Protecao contra perda de dados

### Fechar, recarregar ou sair do dominio

Enquanto houver alteracoes nao salvas, o editor registra `beforeunload`. O navegador exibe seu aviso nativo ao fechar a aba, recarregar ou seguir para fora da aplicacao. O listener e removido assim que o rascunho volta ao estado salvo.

### Navegacao interna por links

Cliques normais em links internos que trocam de rota sao interceptados enquanto o rascunho estiver pendente. Um dialog proprio oferece:

- `Continuar editando`, que permanece na tela;
- `Sair sem salvar`, que executa o destino uma unica vez.

Atalhos do navegador, links externos, downloads, links com `target`, clique com botao diferente e links de ancora da propria pagina preservam o comportamento nativo.

### Voltar e avancar do navegador

Como `popstate` nao e cancelavel, o navegador usa uma confirmacao curta antes de aceitar a troca de historico. Se o usuario cancelar, a entrada atual e restaurada sem limpar o rascunho. Esse comportamento deve ser coberto por E2E para evitar loops ou navegacao dupla.

## Validacao e erros

### Antes de salvar

A validacao cliente cobre o mesmo contrato basico da server action:

- titulo obrigatorio e com no maximo 200 caracteres;
- cliente obrigatorio;
- descricao e observacoes dentro dos limites atuais;
- unidade com no maximo 10 caracteres;
- valores numericos dentro dos limites existentes.

O cliente nao substitui a validacao Zod no servidor.

### Apresentacao

- Erros aparecem abaixo do campo ou da linha correspondente.
- O primeiro campo invalido recebe foco depois da tentativa de salvar.
- O resumo geral permanece apenas para erros sem campo, sessao expirada ou falha do servidor.
- Regioes de erro e estado assincrono usam `aria-live="polite"`.
- Um erro informa o problema e a proxima correcao possivel.

## Arquitetura da interface

### `QuoteEditor`

Continua como orquestrador do fluxo. Ele controla dados, total, prontidao, persistencia e integracao com envio, mas deixa apresentacao de estado e protecao de navegacao em unidades isoladas.

### Utilitarios puros do rascunho

Um modulo sem React concentra:

- criacao do payload persistivel;
- serializacao estavel para comparacao;
- validacao cliente;
- identificacao de linha vazia.

Essas funcoes recebem testes unitarios de limites, normalizacao, ordem e rascunho vazio.

### Protecao de navegacao

Um hook pequeno recebe `isDirty` e expoe o dialog de confirmacao. Ele nao conhece campos, itens, Supabase ou server actions.

### Barra de salvamento

Um componente de apresentacao recebe:

- estado de salvamento;
- total;
- prontidao de envio;
- callbacks de salvar e enviar.

Ele nao persiste dados. No mobile fica acima da navegacao inferior e respeita `safe-area-inset-bottom`. No desktop permanece compacta e sticky sem cobrir conteudo.

### Conferencia de envio

A conferencia deixa de competir com a barra inferior. Ela vira uma faixa compacta com o proximo ajuste e um controle para expandir a lista completa. O conteudo continua acessivel por teclado e leitor de tela.

### `ItemRow`

No mobile, a hierarquia e:

1. descricao;
2. quantidade e unidade;
3. preco unitario e total;
4. acoes.

No desktop, a grade densa atual e preservada. Valores usam `tabular-nums`, controles mantem 44 px e icones decorativos recebem `aria-hidden`.

O `datalist` de unidades e renderizado uma unica vez no editor, evitando identificadores duplicados.

## Remocao e desfazer

Remover uma linha preenchida atualiza o rascunho e apresenta uma faixa compacta `Item removido` com a acao `Desfazer`. A ultima remocao pode ser restaurada na posicao original ate outra remocao ou um salvamento bem-sucedido.

Remover uma linha vazia nao exige confirmacao. Se a ultima linha for removida, o editor mantem uma linha vazia para a proxima digitacao.

## Criacao inicial

A tela de novo orcamento preserva o fluxo em duas etapas:

1. escolher cliente e titulo;
2. abrir o editor para adicionar itens.

O lote apenas alinha densidade, alvos de toque, erros inline, nomes de campos e feedback de envio. A criacao automatica com validade de 15 dias e o limite do Plano Gratis permanecem inalterados.

## Responsividade

### 375 x 812 e 390 x 844

- campos com fonte de 16 px para evitar zoom automatico;
- itens em uma coluna, sem tabela comprimida;
- barra inferior acima da navegacao do app;
- total e estado visiveis sem empurrar as duas acoes para fora da tela;
- nenhum overflow horizontal;
- teclado virtual nao torna Salvar ou Enviar inacessiveis depois da rolagem.

### 768 x 1024

- dados gerais podem usar duas colunas;
- itens permanecem legiveis sem forcar a grade desktop quando ela nao couber;
- barra inferior usa a largura do conteudo e nao da viewport inteira.

### 1440 x 900

- editor respeita sidebar e container atuais;
- grade de itens alinha descricao, quantidade, unidade, preco, total e acoes;
- barra sticky nao cobre a ultima secao;
- foco, hover e estados desabilitados permanecem distinguiveis.

## Acessibilidade

- Todos os campos possuem `label`, `name` e `autocomplete` apropriados.
- Erros usam `aria-describedby` e `aria-invalid` no campo correspondente.
- Icones sem significado independente recebem `aria-hidden`.
- Botoes apenas com icone possuem nome acessivel e tooltip nativo quando necessario.
- Foco visivel em todos os controles.
- Alvos de toque com no minimo 44 x 44 px.
- Dialog de saida controla foco pelo componente compartilhado.
- Cor nao e o unico indicador de salvamento, prontidao ou erro.
- Zoom do navegador permanece habilitado.

## Dados e seguranca

- `updateQuoteAction` continua autenticando usuario e empresa.
- A verificacao de tenant e status draft permanece no servidor.
- A RPC atomica continua sendo a unica operacao de substituicao de itens.
- O cliente nunca define status, total persistido ou empresa.
- Nenhuma informacao sensivel e adicionada a URL, analytics ou armazenamento local.
- A protecao de navegacao reduz perda acidental, mas nao substitui confirmacao do servidor.

## Estrategia de testes

### Unitarios

- payload normalizado com e sem itens;
- linhas vazias ignoradas;
- ordem de itens altera o estado dirty;
- espacos irrelevantes nao criam falso dirty;
- limites de titulo, texto, unidade, quantidade e preco;
- referencia salva atualizada somente depois do sucesso.

### E2E

- criar orcamento e abrir editor em mobile;
- alterar titulo e observar `Alteracoes nao salvas`;
- cancelar uma navegacao interna e permanecer no editor;
- confirmar saida e chegar ao destino;
- salvar rascunho sem item e recarregar o titulo salvo;
- adicionar, reordenar, remover e desfazer item;
- salvar item e conferir total;
- preparar envio somente quando a prontidao estiver completa;
- fluxo principal atual de aprovacao continua verde;
- ausencia de erro de console e overflow horizontal.

### QA visual

Capturas reais, sem mockups, em 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900. A revisao cobre estado inicial, rascunho alterado, erro inline, item preenchido e barra sticky.

## Criterios de aceite

1. O usuario nunca precisa adivinhar se o rascunho atual foi salvo.
2. Fechar, recarregar ou navegar internamente com alteracoes pendentes gera aviso.
3. Salvar um rascunho incompleto funciona sem liberar o envio.
4. Erros de campo aparecem no local correto e recebem foco.
5. O editor continua enviando, gerando link e preservando a aprovacao atual.
6. Nenhum viewport de referencia apresenta zoom inicial, overflow ou conteudo coberto.
7. Remocao acidental de item preenchido pode ser desfeita antes do salvamento.
8. Pagamento, planos, PDF, Asaas, RLS e regras financeiras permanecem inalterados.
9. Typecheck, lint, testes, build, E2E, CI e smoke de producao ficam verdes.
