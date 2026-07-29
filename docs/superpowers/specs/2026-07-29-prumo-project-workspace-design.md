# Prumo UX/UI - Workspace de projeto por áreas

## Contexto

O detalhe do projeto concentra a maior parte do valor operacional do Prumo:
briefing, ambientes, etapas, entregas, cobrança, diário, custos, equipe e link
público. A navegação por âncoras melhorou o acesso a essas funções, mas a
expansão para arquitetura e interiores tornou a página extensa demais,
especialmente no celular.

O próximo lote transforma esse detalhe em um workspace por áreas. O objetivo não
é esconder recursos nem trocar a identidade visual novamente. É reduzir procura,
manter contexto e permitir que o usuário trabalhe em uma atividade por vez.

## Objetivos

1. Permitir que qualquer área do projeto seja aberta em uma ação.
2. Fazer o usuário entender o estado e a próxima ação pelo Resumo.
3. Reduzir drasticamente a rolagem do detalhe no celular.
4. Preservar URLs compartilháveis, histórico do navegador e links antigos.
5. Carregar e renderizar apenas os dados necessários para a área ativa.
6. Preservar rascunhos e impedir perda silenciosa ao trocar de área.
7. Manter intactas as regras de negócio, segurança e faturamento já validadas.

## Não objetivos

Este lote não altera:

- schema, migrations ou políticas RLS;
- status, limites ou permissões de planos;
- cálculos de progresso, custos, margem ou cobrança;
- criação e confirmação de pagamentos no Asaas;
- webhooks, checkout ou cancelamento de assinatura;
- geração de PDF ou rotas públicas;
- contratos de briefing, ambientes ou entregas;
- identidade da landing page;
- conteúdo comercial dos planos.

Recursos que ainda não existem não serão simulados no Resumo.

## Abordagem escolhida

O detalhe passa a ter visualizações reais, selecionadas pela query `view`:

- `resumo`;
- `briefing`;
- `ambientes`;
- `etapas`;
- `entregas`;
- `gestao`.

Arquitetura e interiores recebem as seis áreas. Construção e engenharia recebem
Resumo, Etapas, Entregas e Gestão, porque Briefing e Ambientes ainda não fazem
parte desses segmentos no produto atual.

Somente a visualização ativa é renderizada. O cabeçalho do projeto e a navegação
permanecem estáveis entre as trocas.

## Arquitetura da experiência

### Cabeçalho persistente

O cabeçalho mantém:

- retorno para a lista de projetos ou obras;
- nome, endereço, cliente e data;
- estado atual;
- ação de mudança de status.

Ele permanece compacto e não repete métricas que pertencem ao Resumo.

### Navegação do workspace

No desktop, as áreas aparecem como abas compactas em uma faixa única. No mobile,
um seletor de 44 px mostra a área atual e todas as opções disponíveis, sem exigir
rolagem horizontal oculta.

A navegação:

- usa links reais;
- preserva outros parâmetros válidos da URL;
- marca a área ativa com texto, cor e `aria-current`;
- mantém foco visível;
- funciona com voltar e avançar do navegador;
- não altera dimensões durante carregamento ou troca;
- permanece sticky abaixo da topbar quando houver espaço seguro.

O componente atual `ProjectSectionNav` será substituído por
`ProjectWorkspaceNav`. A responsabilidade do novo componente será somente
resolver navegação, estado visual e compatibilidade de URLs. A proteção contra
saída reutiliza o mecanismo compartilhado de formulários protegidos.

### Resumo

O Resumo funciona como central de decisão, não como uma coleção promocional de
cards. Ele apresenta:

- próxima ação prioritária;
- status e progresso do trabalho;
- prazo, valor contratado e situação financeira resumida;
- pendências do cliente;
- etapa atual;
- atividade recente relevante;
- atalhos contextuais para a área que resolve cada pendência.

Para arquitetura e interiores, o Resumo também mostra:

- preenchimento e estado da revisão do briefing;
- quantidade de ambientes e necessidades pendentes;
- entregas aguardando decisão do cliente.

Para construção e engenharia, ele usa apenas os módulos que esses segmentos já
possuem. Nenhuma métrica inventada será exibida.

### Briefing

A visualização contém somente:

- status e revisão ativa;
- progresso das respostas;
- respostas do cliente;
- histórico de revisões;
- ações de compartilhar, revisar, reabrir ou arquivar.

Sugestões de ambientes continuam no contexto do briefing, pois dependem das
respostas recebidas.

### Ambientes

A visualização contém a lista de ambientes, prioridades, necessidades,
pendências e ações de criação, edição, duplicação e ordenação. Limites por plano
continuam antecipados antes do formulário.

### Etapas

A visualização contém cronograma, progresso, templates e ações das etapas. O
estado sugerido do projeto aparece aqui quando estiver diretamente relacionado
ao andamento; sugestões gerais permanecem no Resumo.

### Entregas

A visualização contém versões, publicação, retorno do cliente, armazenamento e
aceite final. O vínculo com etapas e os limites por plano são preservados.

### Gestão

Gestão reúne as operações internas que não precisam ocupar a leitura principal:

1. cobrança;
2. diário;
3. custos;
4. equipe;
5. link público.

No desktop, diário e custos preservam a grade assimétrica atual. No mobile, as
seções ficam em coluna única. Uma navegação interna curta por âncoras será
exibida no topo de Gestão para Cobrança, Diário, Custos e Equipe. O link público
permanece no final, sem voltar a exibir o projeto inteiro em uma página.

## URLs e compatibilidade

### Query principal

Exemplos:

- `/app/obras/:id?view=resumo`;
- `/app/obras/:id?view=briefing`;
- `/app/obras/:id?view=gestao`.

Sem `view`, o servidor usa `resumo`. Uma opção inválida ou indisponível para o
segmento também retorna ao Resumo sem erro.

### Atenção de cobrança

`?cobranca=atencao` continua válido. Quando `view` não estiver presente, essa
query abre Gestão automaticamente, mantém o destaque da cobrança e não altera
nenhuma ação financeira.

### Links por hash existentes

O cliente converte links antigos:

- `#resumo` para `?view=resumo`;
- `#briefing` para `?view=briefing`;
- `#ambientes` para `?view=ambientes`;
- `#etapas` para `?view=etapas`;
- `#entregas` para `?view=entregas`;
- `#cobranca`, `#diario`, `#custos` e `#equipe` para `?view=gestao`, preservando
  o hash para o salto interno depois do carregamento.

Links do centro de demonstração serão atualizados para a nova query. Favoritos
antigos continuarão funcionando.

## Componentes e limites

### `project-workspace.ts`

Módulo puro responsável por:

- declarar áreas por segmento;
- validar a query `view`;
- mapear hashes antigos;
- decidir a área inicial quando existe atenção de cobrança;
- construir URLs sem apagar parâmetros compatíveis.

Esse módulo não acessa React, navegador ou Supabase e terá testes unitários.

### `ProjectWorkspaceNav`

Componente cliente responsável por:

- abas desktop;
- seletor mobile;
- estado ativo;
- compatibilidade de hashes;
- evento analítico de troca de área.

### `ProjectWorkspaceOverview`

Componente de servidor que organiza o Resumo com dados reais. A versão atual
`ArchitectureProjectOverview` será absorvida ou reutilizada internamente para
evitar duas hierarquias concorrentes.

### Visualizações existentes

`BriefingSection`, `SpacesSection`, `StagesSection`, `DeliverablesSection`,
`BillingSection`, `DiarySection`, `CostsSection`, `TimeSection` e
`PublicLinkCallout` preservam suas regras. Alterações ficam limitadas a
composição, cabeçalhos redundantes e props necessárias para o workspace.

## Dados e carregamento

O carregamento será separado em duas camadas:

1. base do projeto, usada pelo cabeçalho e pela validação de acesso;
2. dados específicos da área ativa.

Consultas específicas serão executadas em paralelo somente quando necessárias:

- Resumo: agregados e registros mínimos para os indicadores;
- Briefing: briefing, revisões e ambientes necessários para sugestões;
- Ambientes: ambientes e necessidades;
- Etapas: etapas e templates;
- Entregas: entregas, aceite, armazenamento e nomes das etapas;
- Gestão: cobranças, diário, custos, ponto e link público.

A divisão ocorrerá em funções de consulta tipadas, sem alterar tabelas ou RLS. O
servidor continuará validando empresa e projeto em todas as consultas.

Essa separação evita enviar o briefing inteiro, todas as entregas e todos os
registros financeiros quando o usuário está trabalhando apenas em Etapas.

## Proteção de rascunhos

O texto ainda não publicado do diário será salvo em `sessionStorage`, usando uma
chave por projeto. Ele será restaurado ao voltar para Gestão e removido após a
publicação bem-sucedida.

Arquivos selecionados não podem ser serializados com segurança. Se houver fotos
selecionadas e o usuário tentar trocar de área, a navegação exibirá uma
confirmação acessível antes de descartar a seleção. Essa confirmação reutiliza
`ProtectedFormNavigation` dentro de `DiaryComposer`, cobrindo abas, seletor,
voltar, avançar e fechamento da página sem duplicar regras de navegação.

Dialogs ativos continuam controlando foco e impedindo interação com a navegação
ao fundo. Nenhuma troca silenciosa pode apagar dados preenchidos.

## Estados e erros

- Área inválida: fallback para Resumo.
- Área indisponível no segmento: fallback para Resumo.
- Área vazia: estado compacto com uma ação principal.
- Falha de consulta: erro contextual com opção de tentar novamente.
- Troca em andamento: skeleton com dimensões estáveis abaixo da navegação.
- Projeto inexistente ou sem acesso: comportamento atual de `notFound`.
- Hash desconhecido: ignorado sem erro.
- Rascunho restaurado: indicação discreta junto ao compositor, sem toast
  bloqueante.

## Direção visual

- Manrope, tokens e paleta atuais são preservados.
- A navegação usa superfície branca, borda discreta e indicador verde.
- Verde continua reservado a ação, seleção e confirmação.
- Laranja permanece restrito a plano ou atenção comercial.
- Títulos internos usam a escala atual; nenhuma seção recebe tipografia de hero.
- Métricas usam números tabulares e uma faixa compacta.
- Raio máximo de 8 px.
- Sem cards aninhados, gradientes decorativos ou animações de layout.
- Conteúdo de cada área usa densidade média e deixa a próxima ação evidente.

## Acessibilidade

- Abas desktop usam links e `aria-current="page"`.
- O seletor mobile possui label acessível visível ou para leitor de tela.
- Foco retorna ao título da área após uma troca iniciada pelo seletor.
- Conteúdo carregado é anunciado sem mover foco durante navegação histórica.
- Controles por ícone mantêm nome acessível e alvo mínimo de 44 x 44 px.
- Cor não é o único indicador de estado.
- `prefers-reduced-motion` é respeitado.
- Zoom do navegador permanece habilitado.

## Analytics

O evento `project_workspace_view_changed` registra:

- segmento;
- área de origem;
- área de destino;
- origem da navegação: aba, seletor, atalho, link antigo ou cobrança.

Nenhum nome de cliente, projeto, valor ou conteúdo de briefing será enviado.

## Estratégia de implementação

1. Criar o resolvedor puro de áreas e seus testes.
2. Implementar a navegação por query e compatibilidade de hashes.
3. Separar o carregamento base das consultas por área.
4. Construir o Resumo compartilhado e adaptar o resumo profissional atual.
5. Compor Briefing, Ambientes, Etapas, Entregas e Gestão individualmente.
6. Proteger rascunho do diário e seleção de arquivos.
7. Atualizar links da demonstração e atalhos internos.
8. Adicionar analytics sem dados sensíveis.
9. Executar gates completos, QA real e deploy gradual.

Cada etapa terá commit próprio. Mudanças de consulta não serão misturadas com
alterações visuais no mesmo commit quando isso dificultar revisão ou rollback.

## Validação

### Automatizada

- testes do resolvedor de áreas e links antigos;
- testes dos conjuntos de áreas por segmento;
- testes da prioridade de `cobranca=atencao`;
- testes da persistência e limpeza do rascunho textual;
- lint;
- typecheck;
- suíte Vitest completa;
- auditoria de dependências de produção;
- build Next.js;
- E2E autenticado das áreas disponíveis.

### QA real

Viewports:

- 375 x 812;
- 390 x 844;
- 768 x 1024;
- 1440 x 900.

Cenários:

- arquitetura Ultimate preenchida;
- construção com projeto em execução;
- plano Grátis no limite;
- workspace demo;
- projeto vazio;
- cobrança com atenção;
- briefing revisado;
- entregas aguardando cliente;
- diário com texto e fotos ainda não publicados;
- voltar e avançar do navegador;
- acesso por link antigo;
- teclado, foco, console e overflow horizontal.

## Critérios de aceite

1. O detalhe inicial cabe em um viewport móvel típico sem expor todos os módulos.
2. Qualquer área fica acessível em uma ação clara.
3. A área ativa permanece identificável em mobile e desktop.
4. URLs podem ser copiadas e restauram a área correta.
5. Links antigos e atenção de cobrança continuam funcionando.
6. Nenhum rascunho é perdido silenciosamente.
7. Apenas dados necessários para a área ativa são carregados.
8. Demo não apresenta nem executa operações financeiras reais.
9. Asaas, PDFs, planos, permissões e links públicos não sofrem regressão.
10. Todos os gates e cenários de QA ficam aprovados antes do deploy.
