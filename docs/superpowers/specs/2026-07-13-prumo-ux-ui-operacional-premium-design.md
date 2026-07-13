# Prumo UX/UI - Operacional premium

## Objetivo

Transformar a interface existente do Prumo em um produto operacional de nivel profissional, com uso confortavel no celular, leitura rapida no desktop e uma linguagem visual coerente com a marca publica.

O redesenho deve aumentar confianca, clareza e velocidade de uso sem alterar regras de negocio, autenticacao, cobranca, integracoes, banco de dados ou geracao de PDF.

## Publico e contexto de uso

O usuario principal e um pequeno empreiteiro, prestador ou gestor de construtora que alterna entre escritorio, obra e WhatsApp. Ele frequentemente usa o produto com uma mao, sob conexao instavel e com pouco tempo para interpretar a tela.

As prioridades de experiencia sao:

1. Entender rapidamente o que precisa de atencao.
2. Criar e enviar um orcamento com poucos desvios.
3. Acompanhar obra, custos e cobrancas sem procurar funcoes.
4. Usar o sistema sem treinamento ou contato com suporte.

## Diagnostico atual

O produto tem uma base funcional consistente, mas a camada visual cresceu por tela. Isso gerou:

- larguras, espacamentos, raios e sombras diferentes entre paginas;
- excesso de superficies enquadradas e cards dentro de cards;
- listas operacionais tratadas como grades de cards grandes;
- componentes compartilhados que nao cobrem todos os padroes recorrentes;
- landing page expressiva e app interno visualmente generico;
- uso de gradientes, cores e elevacoes sem uma hierarquia unica;
- densidade desigual entre Inicio, Orcamentos, Obras, Clientes, Catalogo e Financeiro;
- marca Prumo e nome da empresa apresentados como se fossem a mesma identidade;
- estados vazios e textos de ajuda maiores do que a tarefa exige;
- numeros financeiros sem um tratamento tipografico comum.

Nao ha motivo para redesenhar fluxos de pagamento, login, banco ou regras de plano nesta etapa. Eles serao preservados e apenas receberao acabamento visual em lotes posteriores.

## Direcao aprovada

### Operacional premium

A interface deve ser seria, compacta, clara e confiavel. A personalidade vem da precisao dos detalhes e do contexto de construcao, nao de decoracao excessiva.

Principios:

- informacao primeiro;
- uma acao primaria evidente por tela;
- componentes de tamanho medio e densidade controlada;
- bordas discretas no lugar de sombras pesadas;
- verde Prumo como acao e confirmacao, nao como preenchimento dominante;
- laranja como acento raro para dinheiro, plano ou atencao comercial;
- grafite para estrutura e contraste;
- nenhuma orb, bokeh ou efeito decorativo no app interno;
- gradiente permitido apenas na marca, quando realmente necessario;
- movimento curto e funcional, respeitando `prefers-reduced-motion`.

## Sistema visual

### Cores

Os componentes devem consumir tokens semanticos. Hexadecimal direto deve ficar restrito a definicao dos tokens e a ativos oficiais da marca.

- `canvas`: cinza muito claro, usado no fundo do app;
- `surface`: branco, usado em paineis e controles;
- `surface-subtle`: cinza claro, usado em filtros e estados neutros;
- `ink`: grafite quase preto, usado em titulos e dados principais;
- `ink-muted`: cinza medio com contraste AA para texto secundario;
- `brand`: verde Prumo `#059669`, usado em CTA, foco e estado ativo;
- `brand-strong`: verde escuro para hover e textos sobre fundo claro;
- `commercial`: laranja Prumo `#f47721`, usado com moderacao;
- `success`, `warning`, `danger` e `info`: cores semanticas, sempre acompanhadas de texto ou icone.

A landing pode continuar mais expressiva. O app interno usa a mesma paleta com menos saturacao, menos gradiente e menos sombra.

### Tipografia

- Adotar uma familia sans de leitura limpa e numeros fortes em todo o produto.
- Escala principal: 12, 14, 16, 20, 24 e 32 px.
- Titulos internos: 20 px no celular e 24 px no desktop.
- Corpo: 14 ou 16 px conforme importancia e contexto de toque.
- Textos abaixo de 12 px nao serao usados para informacao essencial.
- Valores financeiros e contagens usam `tabular-nums`.
- Letter spacing permanece neutro; somente pequenas etiquetas em caixa alta podem usar espacamento positivo discreto.
- Titulos devem usar `text-wrap: balance` e descricoes longas `text-wrap: pretty` quando suportado.

### Espacamento, raio e elevacao

- Escala de espacamento: 4, 8, 12, 16, 24 e 32 px.
- Gutters: 16 px no celular, 24 px em tablet e 32 px no desktop.
- Raio padrao: 6 px para controles e 8 px para superficies.
- Pills ficam reservadas a filtros, estados e seletores.
- Sombra padrao quase imperceptivel; sombra media somente em dropdown, dialog e elemento flutuante.
- Hover nao aumenta ou desloca cards. Mudancas usam cor de borda, fundo ou sombra curta.

## Estrutura do app

### Desktop

- Sidebar com aproximadamente 224 px, fixa visualmente durante a navegacao.
- Marca `Prumo` aparece como produto; o nome da empresa aparece abaixo como contexto da conta.
- Navegacao principal ocupa o centro da sidebar.
- Plano, configuracoes e sair ficam agrupados no rodape.
- Conteudo usa largura maxima consistente de aproximadamente 1184 px.
- Paginas operacionais nao viram cards flutuantes dentro do canvas.

### Mobile

- Topbar de 56 px respeitando safe area.
- Marca e empresa ficam legiveis sem competir com o menu.
- Bottom navigation continua com no maximo 5 destinos.
- Item ativo usa cor, peso e indicador visual, sem alterar dimensoes.
- Catalogo, plano, configuracoes e sair permanecem no menu da conta.
- Conteudo reserva espaco para topbar, bottom bar e gesture area.
- Nenhum controle essencial depende de hover ou gesto oculto.

### Cabecalho de pagina

- Titulo, descricao curta e uma acao primaria.
- Acoes secundarias ficam em menu, botao outline ou grupo visualmente subordinado.
- No celular, a acao primaria ocupa a largura apenas quando isso melhora o toque; nao deve virar um bloco exagerado por padrao.
- Descricoes explicam o estado atual, nao o funcionamento inteiro do modulo.

## Componentes compartilhados

### Botoes

- Alturas: 40 px padrao, 44 px para CTA mobile e 36 px compacto.
- Alvos de toque de controles por icone devem atingir pelo menos 44 x 44 px.
- Variantes: primary, secondary, outline, ghost e destructive.
- Icones Lucide com tamanho e espessura consistentes.
- Estado loading preserva a largura e informa a acao em andamento.
- `transition-all` e animacoes que alteram layout nao serao usadas.

### Campos e formularios

- Labels sempre visiveis e associadas ao controle.
- Inputs mobile permanecem com pelo menos 16 px para impedir zoom automatico.
- Ajuda e erro aparecem proximos ao campo relevante.
- Formularios longos usam secoes claras e divulgacao progressiva.
- Barras de acao sticky respeitam a navegacao mobile e nao ocultam conteudo.

### Paineis e cards

- `Panel` enquadra uma ferramenta ou grupo de dados que realmente precisa de superficie.
- `Card` fica reservado a itens repetidos, planos e entidades individuais quando o formato ajuda a comparacao.
- Secoes de pagina sao preferencialmente abertas, com titulo, divisor e conteudo.
- Nao colocar card dentro de card para criar hierarquia.

### Listas operacionais

- Desktop: linhas compactas, alinhamento consistente e colunas previsiveis.
- Mobile: linhas empilhadas com resumo, estado e valor; card somente quando a entidade precisa de toque em toda a area.
- Busca, filtros e contagem formam uma unica toolbar responsiva.
- Filtros relevantes devem poder ser refletidos na URL em uma etapa posterior.
- Listas grandes devem usar paginacao ou `content-visibility`; nao renderizar centenas de cards sem estrategia.

### Metricas

- Metricas aparecem como uma faixa compacta, nao como quatro cards promocionais.
- Label discreta, valor dominante e contexto curto.
- Cor semantica aparece em icone ou indicador, nunca em toda a superficie sem necessidade.
- Valores usam numeros tabulares e suportam textos longos sem quebrar layout.

### Estados, feedback e vazios

- Loading usa skeleton com dimensoes estaveis.
- Erro informa o que aconteceu e a proxima acao possivel.
- Sucesso confirma a mudanca sem bloquear o fluxo.
- Estado vazio orienta uma unica proxima acao e evita grandes areas em branco.
- Toasts e atualizacoes assincronas devem ser anunciados de forma acessivel.

## Aplicacao por tela

### Inicio

- Priorizar proximas acoes e indicadores que mudam decisao.
- Reduzir o guia inicial depois que o usuario avanca.
- Metricas viram uma faixa compacta.
- Obras e orcamentos recentes usam o mesmo padrao de lista.
- Dados de exemplo continuam disponiveis apenas para workspace vazio.

### Orcamentos

- Toolbar unica para busca e filtros.
- Status com badge semantico e contagem discreta.
- Numero, titulo, cliente, validade e valor seguem uma hierarquia fixa.
- CTA `Novo orcamento` permanece a acao primaria.
- Editor prioriza itens, total e envio; secoes auxiliares ficam visualmente subordinadas.

### Obras

- Lista evidencia status, prazo, cliente e valor.
- Detalhe organiza resumo, etapas, diario, custos e cobranca por secoes, evitando uma pilha de cards equivalentes.
- Acoes financeiras permanecem distintas de atualizacoes operacionais.

### Clientes e catalogo

- Compartilham toolbar, contagem, lista e estado vazio.
- WhatsApp continua como atalho explicito sem conflitar com o link da entidade.
- Editar e excluir usam controles por icone com label acessivel e alvo de toque adequado.

### Financeiro

- Resumo financeiro usa numeros tabulares e semantica consistente.
- Cobrancas, margem por obra, gastos por tipo e ultimos gastos ganham niveis visuais diferentes.
- Dinheiro recebido, pendente, margem e atraso nao dependem apenas de cor.

### Plano e checkout

- Conteudo comercial pode ter mais enfase que o restante do app, mas usa os mesmos tokens e componentes.
- Cards de plano nao terao altura fixa desnecessaria.
- Checkout preserva toda a logica atual e reduz efeitos que possam distrair da seguranca e do proximo passo.

### Login, cadastro e paginas publicas

- Serao alinhados em lote posterior.
- A landing mantem sua composicao comercial, mas compartilha tipografia, cores e marca.
- Orcamento publico prioriza leitura, aceite e pagamento, com menos superficies aninhadas.

## Acessibilidade e responsividade

- Contraste minimo AA para texto e controles.
- Foco visivel em todos os elementos interativos.
- Icones decorativos recebem `aria-hidden`; controles por icone recebem `aria-label`.
- Zoom do navegador nunca sera bloqueado.
- Layouts de referencia: 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900.
- Testar textos longos, moeda alta, workspace vazio e listas preenchidas.
- Verificar navegacao por teclado, reduced motion e ausencia de overflow horizontal.

## Limites funcionais

Esta reforma nao altera:

- contratos do Supabase e politicas RLS;
- login, cadastro e associacao de empresa;
- regras e bloqueios dos planos Gratis, Pro e Ultimate;
- criacao, confirmacao ou cancelamento de assinatura no Asaas;
- webhook e liberacao automatica de plano;
- calculos financeiros;
- links publicos, aceite de orcamento e PDFs.

Mudanca funcional descoberta durante o redesenho deve ser tratada em tarefa e commit separados.

## Ordem de implementacao

### Lote 1 - Fundacao e fluxos mais frequentes

- tokens globais e tipografia;
- Button, Input, Card, PageHeader e EmptyState;
- sidebar, topbar e bottom navigation;
- layout e containers do app;
- Inicio;
- lista de Orcamentos.

### Lote 2 - Operacao diaria

- Obras e detalhe de obra;
- Clientes;
- Catalogo;
- Financeiro.

### Lote 3 - Edicao e configuracao

- criacao e edicao de orcamento;
- formularios de cliente e empresa;
- templates e configuracoes;
- diagnostico.

### Lote 4 - Conversao e superficies publicas

- Planos e checkout;
- login, cadastro e onboarding;
- orcamento publico, aceite e acompanhamento;
- ajuste final de consistencia com landing e precos.

Cada lote deve terminar em commit proprio e nao deve ser misturado com alteracoes de backend.

## Validacao por lote

1. Rodar testes, typecheck, lint e build.
2. Fazer QA no app real, sem mockup, nas larguras de referencia.
3. Conferir console, overflow, safe areas, foco, loading, erro e estado vazio.
4. Comparar as telas do lote com os tokens e padroes desta especificacao.
5. Verificar que pagamento, autenticacao, PDFs e regras de plano continuam intactos.

## Criterio de conclusao

O redesenho estara concluido quando as telas parecerem partes do mesmo produto, os fluxos principais forem confortaveis no celular, a hierarquia operacional estiver clara no desktop e um usuario novo conseguir identificar sozinho a proxima acao em cada tela.
