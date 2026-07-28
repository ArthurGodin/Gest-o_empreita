# Prumo - Workspace Demo e Ativacao Segura

Data: 28 de julho de 2026
Status: desenho aprovado; especificacao revisada aguardando revisao do usuario

## 1. Objetivo

Separar tecnicamente a demonstracao comercial da operacao real do Prumo e
melhorar o caminho do primeiro acesso ate o primeiro contrato.

O lote deve permitir que parceiros, avaliadores e potenciais clientes explorem
todos os recursos relevantes sem movimentar dinheiro real, poluir metricas de
uma empresa real ou confundir dados ficticios com clientes verdadeiros.

Ao mesmo tempo, uma empresa real deve entrar em um workspace limpo, entender a
proxima acao e comecar a trabalhar sem depender de atendimento humano.

## 2. Diagnostico atual

O Prumo ja possui:

- onboarding inicial com escolha de segmento;
- linguagem contextual para Arquitetura, Interiores, Engenharia e Obras;
- checklist de ativacao ate o primeiro recebimento;
- kit de demonstracao com cliente, proposta, projeto, custos e cobrancas locais;
- cenarios especificos por segmento;
- roteiro comercial no diagnostico de producao;
- planos centralizados em `PLAN_DEFINITIONS`;
- protecoes existentes para checkout, webhook e cobrancas.

O problema principal e de separacao. O kit atual cria registros dentro da
empresa ativa. Esses registros podem aparecer nas metricas, concluir etapas de
ativacao e ser confundidos com operacao real.

Tambem existem duas oportunidades de UX:

- o checklist ocupa espaco demais no primeiro acesso pelo celular;
- o roteiro de demonstracao esta dentro do diagnostico tecnico, distante da
  navegacao natural de quem esta apresentando o produto.

## 3. Decisao de produto

Cada empresa tera um modo interno:

- `live`: operacao normal, com dados e integracoes reais;
- `demo`: ambiente demonstrativo isolado, com recursos Ultimate e efeitos
  financeiros externos bloqueados.

Uma empresa demo e uma empresa separada no mesmo modelo multiempresa atual.
Nao sera criado um segundo aplicativo, uma copia estatica das telas ou um
produto paralelo.

O modo demo determina seguranca e apresentacao. O plano continua determinando
capacidade funcional. Ao provisionar uma empresa demo, o servidor define seu
plano como Ultimate para que recursos atuais e futuros protegidos por plano
sejam liberados.

Contas de clientes reais nunca receberao dados ficticios automaticamente.

## 4. Alternativas consideradas

### 4.1. Apenas esconder o kit das contas reais

Exigiria pouca alteracao, mas continuaria dependendo de convencoes de nomes e
nao criaria uma barreira confiavel contra cobrancas reais.

### 4.2. Workspace demo separado

Adiciona um modo protegido a empresa, reutiliza o produto real e permite
bloquear efeitos financeiros no servidor.

Esta e a alternativa escolhida por entregar isolamento forte sem introduzir
troca de empresa ou infraestrutura paralela.

### 4.3. Sandbox criado por qualquer usuario

Cada usuario poderia criar e alternar entre workspaces live e demo. Isso
exigiria seletor de empresa, ciclo de vida, limites, permissoes e suporte para
multiplos workspaces por pessoa. O custo e o risco nao se justificam antes da
validacao das primeiras vendas.

## 5. Escopo

### 5.1. Modo da empresa

O banco recebera `companies.workspace_mode`, com valores `live` e `demo`.

Regras:

- o valor padrao e `live`;
- usuarios comuns nao podem alterar o modo;
- somente operacao administrativa confiavel pode provisionar uma empresa demo;
- uma empresa demo usa plano Ultimate;
- o modo deve estar disponivel nas consultas da empresa ativa;
- eventos e logs podem registrar o modo, mas nunca dados pessoais.

O provisionamento de contas demo sera feito por uma operacao administrativa
explicita. E-mails ou IDs de usuarios nao serao gravados em migrations.

### 5.2. Central de demonstracao

Empresas demo receberao o destino `Demonstracao` no app.

A central apresentara um roteiro compacto:

1. resumo do escritorio ou empresa;
2. proposta ou orcamento;
3. link publico e PDF do cliente;
4. projeto ou obra;
5. briefing e ambientes, quando compativeis com o segmento;
6. etapas e entregas;
7. financeiro demonstrativo.

Cada etapa abre a tela real do produto. Nao havera mockup, simulacao visual ou
pagina que replique componentes operacionais.

A central permitira preparar ou restaurar o cenario oficial. Restaurar significa
atualizar os registros canonicos do kit de forma idempotente. A acao nao
excluira registros extras criados pelo avaliador.

No cabecalho do app, empresas demo exibirao um aviso discreto e persistente:
`Ambiente de demonstracao`. O aviso nao deve ocupar altura excessiva nem
competir com a tarefa principal.

### 5.3. Workspace real

Empresas `live` nao visualizarao:

- botao para criar dados de exemplo no painel;
- central de demonstracao;
- acoes de restauracao do kit.

Empresas `demo` nao exibirao o checklist de ativacao comercial no painel. A
central de demonstracao assume essa funcao sem misturar o roteiro ficticio com
metas de uma operacao real.

O primeiro acesso continuara orientado a dados verdadeiros:

1. revisar perfil;
2. cadastrar cliente;
3. criar proposta ou orcamento;
4. compartilhar;
5. obter aprovacao;
6. converter em projeto ou obra;
7. configurar recebimento;
8. confirmar entrada.

O checklist sera contextual:

- Arquitetura, Interiores e Engenharia: `Caminho ate o primeiro contrato`;
- Execucao de obras: `Caminho ate a primeira venda`.

No celular, o checklist inicia compacto e mantem visiveis apenas progresso,
proxima acao e botao principal. A lista completa abre sob demanda.

### 5.4. Estados vazios

Estados vazios relacionados ao primeiro uso devem:

- ter uma unica acao principal;
- usar o vocabulario do segmento;
- evitar texto promocional longo;
- nao sugerir demonstracao em workspaces live;
- manter o layout estavel em celular e desktop.

### 5.5. Promessas comerciais

As promessas de Gratis, Pro e Ultimate serao comparadas com:

- bloqueios de criacao;
- limites de projeto, proposta, briefing, ambientes e entregas;
- marca Prumo em PDF e link;
- SINAPI;
- importacao e exportacao;
- cobranca e financeiro.

So sera alterada uma promessa se a auditoria encontrar divergencia comprovada.
O modo demo nao sera anunciado como recurso dos planos e nao contara como
assinatura ou receita.

## 6. Fora do escopo

Este lote nao inclui:

- compra real de assinatura durante QA;
- criacao automatica e publica de workspaces demo;
- troca de empresa no app;
- ambiente Supabase ou Vercel separado;
- tour com pop-ups em sequencia;
- redesign completo da landing ou do app;
- novos recursos para os planos;
- CRM de leads;
- configuracao de campanhas ou criativos;
- exclusao automatica de todos os dados criados por avaliadores;
- mudanca de precos.

Uma compra controlada final continua dependendo de outro pagador, autorizacao
explicita e acompanhamento humano.

## 7. Arquitetura funcional

O lote sera dividido em unidades pequenas:

- `workspace mode domain`: normalizacao, verificacao e mensagens;
- `workspace queries`: leitura do modo junto da empresa ativa;
- `live side-effect guard`: bloqueio reutilizavel para operacoes financeiras;
- `demo kit guard`: permite preparar dados apenas em empresas demo;
- `demo scenario domain`: links e etapas por segmento;
- `demo center`: interface autenticada da demonstracao;
- `demo workspace notice`: identificacao persistente no shell;
- `activation domain`: titulo e proxima acao por segmento;
- auditoria de planos e testes de fidelidade.

Componentes visuais nao decidirao se uma operacao financeira e permitida. O
servidor repetira a verificacao imediatamente antes de qualquer efeito externo.

## 8. Modelo de dados

### 8.1. `companies.workspace_mode`

Coluna:

- tipo textual;
- obrigatoria;
- padrao `live`;
- restricao para `live` ou `demo`.

Indices adicionais nao sao necessarios para o primeiro lote, pois a coluna sera
lida pela chave primaria da empresa.

### 8.2. Protecao de escrita

A protecao de campos sensiveis de `companies` sera ampliada para impedir que um
cliente autenticado altere `workspace_mode`.

Quando `workspace_mode` for `demo`, o provisionamento administrativo tambem
definira `plan = ultimate`. O navegador nao podera usar essa regra para elevar
uma empresa live.

### 8.3. Tipos

Os tipos Supabase e contratos locais passarao a representar:

```ts
type WorkspaceMode = "live" | "demo";
```

Valores desconhecidos serao tratados como `live`. Essa escolha e conservadora:
uma falha de leitura nunca deve liberar comportamento demonstrativo ou contornar
uma protecao financeira.

## 9. Seguranca financeira

### 9.1. Operacoes bloqueadas em demo

O servidor rejeitara em empresas demo:

- criacao ou reutilizacao de checkout de assinatura;
- ativacao manual ou simulada de plano pela interface comum;
- cancelamento ou troca de assinatura inexistente;
- criacao de cliente ou assinatura no Asaas;
- emissao de Pix, boleto ou cartao pelo Asaas;
- regeneracao de cobranca externa;
- gravacao de configuracao de recebimento real.

Registros financeiros locais em estado de rascunho continuarao disponiveis para
demonstrar entrada, saldo, margem e fluxo de caixa.

### 9.2. Webhook

Se uma referencia externa apontar para uma empresa demo, o webhook nao ativara
plano nem associara cobranca. O evento sera registrado sem segredo ou dado
pessoal e encerrado de forma segura.

Eventos validos de empresas live preservam o comportamento atual.

### 9.3. Interface

Botoes financeiros externos nao serao apenas desabilitados. Eles serao
substituidos por uma indicacao curta de que pagamentos reais estao protegidos
na demonstracao.

A pagina de plano mostrara `Ultimate demonstracao`, sem CTA de assinatura,
upgrade ou cancelamento.

### 9.4. Falha segura

Se o modo da empresa nao puder ser carregado, a operacao externa falhara. O app
nao assumira `live` para executar um pagamento quando a consulta estiver
incompleta.

## 10. Dados de demonstracao

O kit existente sera preservado e endurecido.

Regras:

- exige usuario autenticado e membership da empresa ativa;
- exige `workspace_mode = demo`;
- usa o cenario do segmento atual;
- nao usa telefone real de cliente;
- cria apenas cobrancas locais em rascunho;
- cria ou atualiza registros canonicos pelo nome e cadeia de propriedade;
- reaproveita tokens publicos ja existentes;
- nunca remove dados fora do conjunto canonico;
- retorna links diretos para proposta, projeto e portal publico;
- registra se o cenario foi criado ou restaurado.

O cenario de Arquitetura e Interiores inclui briefing e ambientes. Engenharia e
Obras preservam seus cenarios especificos atuais.

## 11. UX e responsividade

### 11.1. Shell demo

- aviso compacto no topo;
- destino `Demonstracao` visivel no menu lateral e no acesso mobile adequado;
- sem alterar a quantidade fixa de itens da barra inferior quando isso
  prejudicar largura ou legibilidade;
- alvos de toque com pelo menos 44 px;
- foco visivel e rotulos acessiveis.

### 11.2. Central

- cabecalho de tamanho operacional, sem hero;
- progresso e acao principal acima da dobra;
- lista compacta, sem cards dentro de cards;
- links diretos e estados claros;
- restauracao com confirmacao;
- mensagens curtas para sucesso e falha;
- nenhum texto ensina controles obvios.

### 11.3. Ativacao

- resumo recolhido por padrao;
- proxima acao sempre disponivel;
- expansao voluntaria da lista completa;
- sem deslocamento de layout durante carregamento;
- linguagem contextual por segmento;
- guia exibido e concluido apenas em workspaces live.

### 11.4. Viewports de QA

- 360 x 800;
- 390 x 844;
- 768 x 1024;
- 1440 x 900.

Nao pode haver zoom inesperado, rolagem horizontal, texto cortado, botoes fora
da area segura ou sobreposicao com a barra mobile.

## 12. Eventos e observabilidade

Novos eventos, sem dados pessoais:

- central de demonstracao aberta;
- cenario demonstrativo preparado;
- cenario demonstrativo restaurado;
- etapa do roteiro aberta;
- operacao financeira bloqueada em demo;
- checklist de ativacao expandido;
- proxima acao de ativacao aberta.

Logs de servidor registrarao:

- `workspace_mode`;
- tipo de operacao;
- resultado;
- identificador tecnico ja permitido pelas regras atuais.

Chaves, documentos, telefones, tokens publicos e URLs de checkout nao serao
registrados.

## 13. Tratamento de erros

- Empresa sem modo legivel: bloquear efeito financeiro e orientar nova
  tentativa.
- Kit chamado em empresa live: rejeitar sem criar nenhum registro.
- Checkout chamado em demo: retornar mensagem de ambiente protegido.
- Cobranca Asaas chamada em demo: nao fazer requisicao externa.
- Restauracao parcial: informar falha, preservar registros validos e permitir
  nova execucao idempotente.
- Link canonico ausente: preparar o cenario antes de abrir o roteiro.
- Recurso indisponivel para o segmento: omitir a etapa, sem mostrar destino
  quebrado.
- Migration ausente em um deploy antigo: manter a interface demo desativada e
  bloquear o rollout ate banco e codigo estarem alinhados.

## 14. Testes

### 14.1. Unidade

- normalizacao de `workspace_mode`;
- modo desconhecido tratado como live;
- roteiro por segmento;
- titulo do checklist por segmento;
- estado compacto e proxima acao;
- mensagens dos bloqueios;
- correspondencia entre promessas e limites publicos verificaveis.

### 14.2. Servidor e banco

- usuario comum nao altera `workspace_mode`;
- empresa live nao prepara kit;
- empresa demo prepara e restaura kit;
- dados demo nao atravessam empresas;
- empresa demo nao cria checkout;
- empresa demo nao chama Asaas;
- webhook nao ativa empresa demo;
- empresa live preserva checkout, cobranca e webhook;
- plano Ultimate demo nao cria assinatura nem receita;
- execucoes concorrentes do kit nao duplicam o cenario canonico.

### 14.3. E2E

1. entrar em uma conta demo;
2. identificar claramente o ambiente;
3. abrir a central;
4. restaurar o cenario;
5. navegar por proposta, link publico, projeto e financeiro;
6. validar briefing e ambientes em Arquitetura;
7. tentar uma operacao financeira e confirmar o bloqueio;
8. entrar em uma conta live vazia;
9. confirmar ausencia de dados e controles demo;
10. executar cliente, proposta e proxima acao de ativacao.

### 14.4. Regressao e gates

- suite completa de testes;
- typecheck;
- lint sem cache;
- build de producao;
- testes E2E focados;
- QA visual nos quatro viewports;
- smoke de login, proposta, PDF, link publico, projeto e configuracoes;
- auditoria de codigo do checkout, Asaas e webhook;
- nenhuma cobranca real durante QA automatizado.

## 15. Rollout

1. Criar migration aditiva e atualizar tipos.
2. Implementar dominio e protecoes de servidor.
3. Cobrir bloqueios com testes antes da interface.
4. Implementar central, aviso e ativacao compacta.
5. Validar localmente com empresas live e demo separadas.
6. Executar regressao completa.
7. Aplicar migration em producao.
8. Marcar contas demonstrativas por operacao administrativa explicita.
9. Publicar exatamente o commit validado.
10. Executar smoke autenticado em live e demo.
11. Monitorar logs de bloqueio e erros apos o deploy.

O rollback visual pode esconder a central e o aviso. A migration e aditiva e
nao sera revertida destrutivamente. Se houver falha, workspaces existentes
continuam `live` por padrao.

## 16. Criterios de aceite

O lote estara pronto quando:

- toda empresa possuir modo valido, com padrao live;
- usuarios comuns nao conseguirem trocar o modo;
- workspaces demo receberem acesso Ultimate sem assinatura;
- demo e live forem visualmente distinguiveis;
- kit de exemplo funcionar somente em demo;
- dados ficticios nao aparecerem em empresas reais;
- checkout, Asaas e webhook recusarem empresas demo no servidor;
- recursos internos e links publicos continuarem utilizaveis na demo;
- onboarding live levar ao primeiro dado real;
- checklist ficar compacto no celular e contextual ao segmento;
- promessas dos tres planos permanecerem fieis ao codigo;
- nenhum fluxo financeiro live regredir;
- todos os gates de teste e QA passarem;
- producao for validada sem gerar uma nova cobranca real.
