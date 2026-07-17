# Prumo SINAPI Profissional V1

Data: 17/07/2026

Status: direcao aprovada; especificacao escrita aguardando revisao final

Produto: Prumo

Plano inicial: Ultimate

## 1. Objetivo

Adicionar ao Prumo uma consulta profissional de referencias SINAPI que ajude o
empreiteiro a montar orcamentos com mais velocidade e rastreabilidade, sem
apresentar o custo oficial como preco de venda automaticamente correto.

A primeira versao deve permitir:

- pesquisar insumos e composicoes por codigo ou descricao;
- escolher UF, competencia e, quando aplicavel, regime;
- visualizar custo oficial e fonte de forma explicita;
- aplicar acrescimo ou editar o preco final;
- adicionar a referencia ao orcamento;
- salvar a referencia no catalogo proprio;
- preservar um snapshot imutavel dos dados usados;
- continuar operando com a ultima base valida se uma importacao falhar.

O nome interno deste ciclo e `SINAPI Profissional V1`. O termo `Lite` nao deve
aparecer para o cliente, pois descreve apenas o limite de escopo tecnico desta
primeira entrega e nao a qualidade do recurso.

## 2. Contexto confirmado

O Prumo V1 ja possui:

- catalogo manual por empresa;
- importacao de catalogo CSV de ate 500 itens no Ultimate;
- autocomplete do catalogo dentro do editor de orcamento;
- itens de orcamento persistidos como snapshots de descricao, unidade,
  quantidade e preco;
- UF configuravel no onboarding e nas configuracoes da empresa;
- planos Gratis, Pro e Ultimate centralizados em `web/src/lib/plans.ts`;
- server actions autenticadas, RLS por empresa e RPC atomica para substituir os
  itens de um orcamento;
- testes unitarios, de banco, E2E desktop e E2E mobile.

Nao existe hoje base SINAPI, parser XLSX oficial, busca SINAPI, memoria de fonte
em itens ou promessa publica de integracao SINAPI.

## 3. Fonte oficial e limites de uso

O SINAPI e mantido pela CAIXA em parceria com o IBGE. A CAIXA publica
mensalmente relatorios de insumos e composicoes e, a partir de 2025, disponibiliza
arquivos XLSX com todas as UFs no pacote mensal.

Fontes de referencia desta especificacao:

- CAIXA: https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx
- Metodologias e conceitos: https://www.caixa.gov.br/Downloads/sinapi-metodologia/Livro_SINAPI_Metodologias_Conceitos.pdf
- Calculos e parametros: https://www.caixa.gov.br/Downloads/sinapi-metodologia/Livro_SINAPI_Calculos_Parametros.pdf
- IBGE: https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9270-sistema-nacional-de-pesquisa-de-custos-e-indices-da-construcao-civil.html

Regras de produto:

- sempre citar `Fonte: SINAPI/CAIXA` junto da competencia e UF;
- nunca ocultar a competencia;
- nunca converter ausencia de preco em zero;
- nunca chamar custo de referencia de preco final obrigatorio;
- nunca atualizar silenciosamente um orcamento existente;
- nao reproduzir logotipos oficiais como se houvesse parceria ou endosso;
- preservar no processo de ingestao o arquivo e o hash que originaram a base;
- revisar termos, fonte e atribuicao antes da ativacao comercial.

## 4. Escopo

### 4.1 Incluido

- ingestao administrativa dos pacotes ZIP/XLSX oficiais;
- publicacoes versionadas por competencia e revisao;
- insumos e composicoes;
- precos para as 27 UFs quando publicados na fonte;
- regime desonerado e nao desonerado para referencias em que isso se aplica;
- busca protegida por codigo e descricao;
- filtros por tipo, UF, competencia e regime;
- inclusao no catalogo e no editor de orcamento;
- acrescimo percentual e edicao do preco final;
- snapshot de origem no catalogo e no orcamento;
- feature flag server-side;
- autorizacao Ultimate na aplicacao e no banco;
- operacao mensal documentada;
- observabilidade, testes e QA responsivo.

### 4.2 Fora desta entrega

- decomposicao analitica completa das composicoes na interface;
- edicao de coeficientes;
- substituicao assistida de insumos;
- calculadora de BDI;
- curva ABC;
- cronograma fisico-financeiro baseado no SINAPI;
- comparacao visual entre varias competencias;
- atualizacao automatica de itens ja usados;
- integracao em tempo real com o site da CAIXA;
- upload de arquivos SINAPI pelos clientes;
- promessa publica antes da validacao de dados reais.

Esses itens formam o ciclo posterior `SINAPI Analitico`.

## 5. Alternativas avaliadas

### 5.1 Base central versionada no Prumo - escolhida

Um processo administrativo importa e valida os arquivos oficiais. O aplicativo
consulta a base propria e nao depende da disponibilidade da CAIXA durante o uso.

Vantagens:

- busca previsivel e rapida;
- controle de retificacoes;
- historico auditavel;
- falha segura;
- experiencia uniforme para todos os clientes.

### 5.2 Consulta externa em tempo real - rejeitada

Criaria dependencia de disponibilidade, formato e desempenho de uma pagina que
nao e uma API contratual do Prumo. Uma mudanca externa poderia interromper o
editor de orcamento.

### 5.3 Upload por cliente - rejeitada

Transferiria complexidade para o usuario, permitiria competencias divergentes e
enfraqueceria a proposta de um produto autossuficiente.

## 6. Principios de arquitetura

1. A ingestao e separada do trafego dos clientes.
2. Uma publicacao so fica pesquisavel depois de validada e publicada.
3. Publicacoes e snapshots sao imutaveis.
4. Retificacao cria nova revisao; nao altera a anterior.
5. Falha nova nao derruba a ultima base valida.
6. O banco autoriza o plano; a interface nao e a unica barreira.
7. O servidor resolve os dados oficiais novamente antes de persisti-los.
8. O usuario controla o preco de venda, mas nao pode falsificar o selo de fonte.
9. A funcionalidade fica escondida por feature flag ate passar por dados reais.
10. O catalogo atual continua independente do SINAPI.

## 7. Componentes e responsabilidades

### 7.1 Importador administrativo

Local definido: `web/scripts/sinapi/`.

Responsabilidades:

- receber arquivo local, URL oficial, competencia e metadados de publicacao;
- calcular SHA-256 antes de ler o conteudo;
- arquivar o pacote original em storage privado;
- usar parser XLSX estruturado;
- identificar apenas layouts oficiais suportados;
- normalizar codigos, descricoes, unidades, UFs, regimes e centavos;
- agregar precos de UF sem perder ausencia de valor;
- produzir relatorio de validacao;
- gravar uma publicacao em `staging`;
- publicar apenas por comando explicito e separado.

O importador nao usa credenciais do navegador e nao fica acessivel por rota
publica. A escrita exige service role em ambiente administrativo controlado.

### 7.2 Repositorio SINAPI

Modulo server-only responsavel por:

- listar competencias publicadas;
- obter a publicacao atual de uma competencia;
- pesquisar referencias autorizadas;
- resolver uma referencia por identificador e UF;
- expor tipos de retorno pequenos e estaveis para as server actions.

Nenhum componente React consulta tabelas SINAPI diretamente.

### 7.3 Server actions

Responsabilidades:

- autenticar usuario e empresa ativa;
- conferir feature flag;
- conferir Ultimate;
- validar UF, competencia, regime, busca, limite e cursor;
- chamar RPC protegida;
- registrar eventos sem dados sensiveis;
- retornar erros de dominio previsiveis.

### 7.4 Interface de consulta

Responsabilidades:

- apresentar filtros e fonte;
- manter estado de busca e selecao;
- calcular apenas a pre-visualizacao do preco final;
- enviar identificador, UF, acrescimo e preco final ao servidor;
- nunca definir por conta propria o custo oficial persistido.

## 8. Modelo de dados

### 8.1 Tipos

Criar os seguintes enums PostgreSQL:

- `sinapi_release_status`: `staging`, `published`, `superseded`, `rejected`;
- `sinapi_reference_kind`: `input`, `composition`;
- `sinapi_regime`: `reference`, `desonerado`, `nao_desonerado`.

`reference` e usado quando o regime nao altera aquela referencia. A interface
nao pede uma escolha sem efeito para insumos.

### 8.2 `sinapi_releases`

Campos:

- `id uuid primary key`;
- `competence date not null`, sempre primeiro dia do mes;
- `revision smallint not null`, iniciando em 1;
- `status sinapi_release_status not null`;
- `source_url text not null`;
- `source_file_name text not null`;
- `source_storage_path text not null`;
- `source_sha256 text not null`;
- `source_published_at timestamptz null`;
- `imported_at timestamptz not null`;
- `published_at timestamptz null`;
- `imported_by text null`, identificador operacional sem segredo;
- `row_count integer not null`;
- `priced_row_count integer not null`;
- `validation_summary jsonb not null`;
- `created_at timestamptz not null`.

Restricoes:

- `competence` deve ser primeiro dia do mes;
- `revision > 0`;
- SHA-256 deve ter 64 caracteres hexadecimais;
- unicidade de `(competence, revision)`;
- unicidade de `source_sha256`;
- apenas uma revisao `published` por competencia;
- publicacao exige contagens positivas e resumo aprovado.

Uma retificacao publica a nova revisao e marca a anterior da mesma competencia
como `superseded` na mesma transacao. A revisao anterior permanece armazenada.

### 8.3 Arquivos de origem

Criar bucket privado `sinapi-sources`, sem policy para `anon` ou
`authenticated`. Apenas o processo administrativo com service role pode gravar
ou ler os pacotes. O caminho segue a forma
`<competencia>/rev-<revisao>/<sha256>/<arquivo>`.

O arquivo original e o relatorio de validacao ficam preservados para auditoria,
mas nunca sao oferecidos como download no aplicativo dos clientes. A publicacao
so referencia um objeto depois de conferir novamente seu hash.

### 8.4 `sinapi_entries`

Uma linha representa uma referencia dentro de uma publicacao e regime. Para
evitar multiplicar cada referencia por 27, os precos por UF ficam em um mapa
JSONB validado pelo importador.

Campos:

- `id uuid primary key`;
- `release_id uuid not null references sinapi_releases(id) on delete cascade`;
- `kind sinapi_reference_kind not null`;
- `code text not null`;
- `description text not null`;
- `unit text not null`;
- `regime sinapi_regime not null`;
- `prices_cents jsonb not null`, como `{ "PI": 12345, "SP": 14590 }`;
- `price_origins jsonb not null default '{}'` quando a fonte trouxer origem;
- `search_text text not null`, normalizado sem acentos pelo importador;
- `created_at timestamptz not null`.

Restricoes:

- unicidade de `(release_id, kind, code, regime)`;
- codigo, descricao e unidade nao vazios;
- chaves de `prices_cents` limitadas as 27 UFs;
- valores inteiros nao negativos;
- ausencia de preco representada pela ausencia da chave, nunca por zero
  inventado;
- trigger impede update ou delete de releases e entradas com estado `published`
  ou `superseded`;
- cascade so pode limpar releases `staging` ou `rejected`.

Indices:

- B-tree para publicacao, tipo, regime e codigo;
- trigram GIN em `search_text`;
- indice para ordenacao por codigo.

### 8.5 Snapshot no `catalog_items`

Adicionar campos opcionais:

- `reference_source text` limitado a `sinapi`;
- `sinapi_entry_id uuid`;
- `reference_code text`;
- `reference_kind sinapi_reference_kind`;
- `reference_uf text`;
- `reference_competence date`;
- `reference_revision smallint`;
- `reference_regime sinapi_regime`;
- `reference_description text`;
- `reference_unit text`;
- `reference_cost_cents bigint`;
- `reference_adjustment_basis_points integer`;
- `reference_release_sha256 text`.

`default_price_cents` continua sendo o preco final escolhido pelo usuario.

### 8.6 Snapshot no `quote_items`

Adicionar os mesmos campos de origem do catalogo. `unit_price_cents` continua
sendo o preco final do item e `total_cents` continua derivado de quantidade e
preco final.

O snapshot e copiado da base pelo banco. Descricao e unidade comerciais do item
podem ser editadas, mas os campos `reference_*` preservam o que a fonte dizia.

### 8.7 Integridade dos snapshots

Uma funcao/trigger compartilhada deve:

- aceitar `sinapi_entry_id` e UF;
- verificar que a entrada pertence a uma publicacao publicada ou superseded;
- verificar que existe preco para a UF;
- conferir que a empresa esta no Ultimate;
- sobrescrever todos os campos oficiais com dados do banco;
- preservar somente acrescimo e preco final como escolha do usuario;
- rejeitar combinacoes parciais ou inconsistentes.

Assim, um cliente modificado nao consegue inserir um item falso com selo SINAPI.

## 9. Autorizacao e RLS

- `sinapi_releases` e `sinapi_entries` nao recebem policies publicas de escrita.
- Escrita e feita apenas pelo importador administrativo.
- Tabelas brutas nao ficam selecionaveis por `anon`.
- A leitura do aplicativo ocorre por RPC `security definer` com `search_path`
  fixo.
- A RPC valida `auth.uid()`, membership na empresa e `plan = ultimate`.
- A RPC limita quantidade, tamanho da busca, UFs, tipos e regimes aceitos.
- Free e Pro recebem erro de dominio mesmo chamando a RPC fora da interface.
- O retorno contem apenas campos necessarios para a tela.
- Funcoes administrativas nao recebem `grant execute` para `authenticated`.

As migrations devem seguir os hardenings ja adotados no projeto: revogacao
explicita, `search_path` fixo, validacao de tenant e testes de privilegio.

## 10. Busca

Entrada:

- empresa ativa;
- texto com no minimo 2 e no maximo 100 caracteres;
- UF valida;
- competencia publicada;
- tipo;
- regime aplicavel;
- limite maximo 20;
- cursor ou offset limitado.

Ordenacao:

1. codigo exato;
2. prefixo de codigo;
3. descricao iniciada pelo termo;
4. similaridade de descricao;
5. codigo crescente como desempate.

Saida:

- identificador da entrada;
- codigo;
- descricao;
- unidade;
- tipo;
- regime;
- UF;
- competencia e revisao;
- custo de referencia em centavos;
- fonte curta.

Nao retornar entradas sem preco para a UF por padrao. A interface pode mostrar
uma contagem separada de referencias sem preco apenas em evolucao posterior.

Meta de experiencia: primeira pagina percebida em ate 1 segundo em conexao
normal. A consulta de banco deve ser validada com volume representativo e alvo
de ate 500 ms no ambiente de teste.

## 11. Experiencia do usuario

### 11.1 Catalogo

A pagina existente recebe controle segmentado compacto:

- `Meu catalogo`;
- `Referencias SINAPI`.

Nao criar uma nova entrada na navegacao principal. O SINAPI complementa o
catalogo e nao compete com Orcamentos, Obras, Clientes ou Financeiro.

Filtros SINAPI:

- busca por codigo ou descricao;
- tipo: Insumos ou Composicoes;
- UF, iniciada pela empresa;
- competencia, iniciada pela ultima publicada;
- regime apenas quando aplicavel.

Cada resultado mostra:

- codigo e descricao;
- unidade;
- custo formatado;
- UF e competencia em linha secundaria curta;
- indicador de tipo.

### 11.2 Selecao e preco final

Ao selecionar uma referencia, abrir painel lateral no desktop e folha inferior
ampla no mobile. O painel mostra:

- custo oficial;
- fonte, UF, competencia, revisao e regime;
- campo `Acrescimo (%)`;
- campo `Preco final`, editavel;
- acao `Adicionar ao orcamento` quando aberto pelo editor;
- acao `Salvar no meu catalogo`;
- aviso `Custo de referencia. Confirme condicoes locais antes de enviar.`

Alterar acrescimo recalcula o preco final. Editar o preco final recalcula apenas
a pre-visualizacao do acrescimo; o banco persiste ambos de forma normalizada.
Percentuais usam basis points para evitar `float`.

### 11.3 Editor de orcamento

Adicionar botao discreto `Buscar no SINAPI` proximo de `Adicionar item`.

O autocomplete atual continua mostrando somente o catalogo da empresa. Nao
misturar milhares de referencias globais em cada digitacao.

Depois da escolha:

- inserir nova linha com descricao, unidade e preco final;
- marcar visualmente `SINAPI`, sem transformar a linha em card grande;
- permitir editar descricao comercial, unidade, quantidade e preco final;
- manter detalhes da fonte acessiveis por acao secundaria;
- incluir a mudanca no mecanismo atual de rascunho protegido.

### 11.4 Mobile

- nenhuma tabela larga;
- resultados em linhas compactas e empilhadas;
- filtros secundarios em folha propria;
- UF, competencia e tipo sempre visiveis no resumo dos filtros;
- acao primaria fixa somente dentro da folha de selecao;
- teclado decimal nos campos de preco e acrescimo;
- nenhum input menor que 16 px de fonte para evitar zoom;
- nenhum controle coberto pela navegacao inferior;
- estados de loading com dimensoes estaveis.

### 11.5 Empresas sem UF

Se a empresa nao tem UF valida:

- abrir seletor obrigatorio antes da primeira busca;
- oferecer `Salvar como UF da empresa`;
- apontar para Configuracoes sem perder o contexto;
- validar a UF contra a lista oficial, nao apenas pelo tamanho de duas letras.

Onboarding e Configuracoes passam a usar a mesma lista central de 27 UFs.

## 12. Planos e comunicacao comercial

O recurso nasce no Ultimate. Isso combina com o posicionamento atual de
catalogo em escala e exportacao contabil.

Regras:

- `canUseSinapi` deve ser entitlement centralizado;
- a interface nao deve comparar strings de plano em varios componentes;
- Free e Pro continuam com catalogo manual sem degradacao;
- usuarios nao elegiveis veem chamada discreta com link para Planos;
- o recurso nao entra na landing, Precos ou materiais do Asafe antes de:
  - uma publicacao real estar ativa;
  - busca e snapshots passarem em E2E;
  - duas importacoes, incluindo uma nova competencia ou retificacao, terem sido
    exercitadas com sucesso;
  - a operacao mensal estar documentada;
  - fonte e texto comercial terem sido revisados.

Texto comercial permitido depois do gate:

`Consulta de referencias SINAPI por UF e competencia`.

Textos proibidos:

- `Orcamento oficial automaticamente correto`;
- `Preco garantido`;
- `Integracao em tempo real com a CAIXA`;
- `SINAPI completo` enquanto o modulo analitico nao existir.

## 13. Ingestao e retificacao

### 13.1 Dry run obrigatorio

O comando padrao apenas analisa e gera relatorio. Publicar exige uma flag ou
comando separado. O relatorio inclui:

- hash e nome do arquivo;
- competencia detectada e informada;
- abas reconhecidas;
- total por tipo, regime e UF;
- referencias com e sem preco;
- codigos duplicados;
- unidades vazias ou invalidas;
- valores negativos ou nao numericos;
- UFs desconhecidas;
- diferenca percentual de contagem contra a publicacao anterior;
- amostra das maiores variacoes de preco;
- erros bloqueantes e avisos.

### 13.2 Publicacao

1. Criar release `staging`.
2. Inserir entradas em lotes idempotentes.
3. Executar validacoes no banco.
4. Conferir contagens contra o relatorio local.
5. Publicar em transacao curta.
6. Marcar revisao anterior da mesma competencia como `superseded`.
7. Registrar evento operacional.

Se qualquer lote falhar, a release de staging pode ser removida sem tocar nas
publicadas. Reexecutar o mesmo hash nao cria duplicata.

### 13.3 Operacao inicial

A descoberta e o download do arquivo sao manuais nesta versao. Isso evita
acoplamento a HTML e nomes de arquivo externos. A importacao e validacao sao
automatizadas pelo CLI.

Automatizar a descoberta mensal so entra depois de duas operacoes consecutivas
e de um mecanismo confiavel de detectar publicacoes e retificacoes.

## 14. Falhas e mensagens

### Sem release publicada

Mostrar `A base SINAPI esta temporariamente indisponivel. Seu catalogo continua
funcionando normalmente.` Nao exibir busca vazia como se nenhum item existisse.

### Release antiga

Competencia sempre visivel. Se a ultima competencia publicada tiver mais de 60
dias, mostrar aviso administrativo e aviso discreto na consulta.

### Sem preco para UF

Nao permitir adicionar. Usar `A CAIXA nao publicou preco para esta referencia
na UF e competencia selecionadas.`

### Plano sem acesso

Retornar erro tipado `plan_required`, traduzido em chamada para o Ultimate. Nao
usar erro generico de permissao na interface.

### Importacao invalida

Manter release anterior, gravar release rejeitada ou relatorio fora das tabelas
publicadas e encerrar com codigo de saida diferente de zero.

### Concorrencia

Publicacao usa lock transacional por competencia. Duas importacoes nao podem
publicar revisoes concorrentes.

## 15. Observabilidade

Eventos de produto, sem texto pesquisado ou dados pessoais:

- `sinapi_search_started`;
- `sinapi_search_succeeded`;
- `sinapi_search_empty`;
- `sinapi_reference_opened`;
- `sinapi_added_to_quote`;
- `sinapi_saved_to_catalog`;
- `sinapi_upgrade_viewed`.

Dimensoes permitidas:

- tipo;
- UF;
- competencia;
- regime;
- quantidade de resultados;
- origem da acao: catalogo ou editor.

Logs operacionais:

- importacao iniciada/concluida/rejeitada;
- hash, competencia, revisao e contagens;
- duracao de parsing, insercao, validacao e publicacao;
- erro sanitizado e etapa;
- alerta quando a base ultrapassar 60 dias.

Nunca registrar service role, conteudo completo do arquivo ou consulta digitada
pelo cliente.

## 16. Testes

### 16.1 Unidade

- normalizacao de codigo, unidade, descricao e busca;
- conversao monetaria para centavos;
- parser de celulas vazias e formatos numericos;
- validacao das 27 UFs;
- calculo de acrescimo com basis points;
- ordenacao de resultados;
- mensagens e estados tipados;
- parser com fixture minima baseada no layout oficial, sem arquivo completo.

### 16.2 Importador

- dry run nao escreve;
- mesmo hash e idempotente;
- competencia divergente bloqueia;
- aba desconhecida bloqueia;
- duplicata bloqueia;
- valor negativo bloqueia;
- ausencia de preco nao vira zero;
- falha em lote nao publica parcialmente;
- retificacao cria revisao e preserva anterior;
- contagens locais e do banco coincidem.

### 16.3 Banco e seguranca

- anon nao le nem escreve;
- authenticated nao escreve releases;
- Free e Pro nao pesquisam pela RPC;
- Ultimate membro pesquisa;
- usuario de outra empresa nao usa o entitlement alheio;
- parametros invalidos sao rejeitados;
- cliente nao falsifica custo, UF, competencia ou hash;
- snapshot continua igual depois de nova release;
- release publicada nao sofre update/delete;
- funcoes possuem `search_path` fixo e grants minimos.

### 16.4 Integracao

- busca por codigo exato, prefixo, acento e descricao;
- selecao de competencia e UF;
- insumo sem seletor de regime inutil;
- composicao com regime correto;
- salvar no catalogo;
- adicionar e salvar orcamento pela RPC atomica;
- duplicar e revisar orcamento preservando snapshot;
- PDF mostra preco final e, se previsto no layout aprovado, fonte sem poluicao;
- catalogo manual continua funcionando com feature flag desligada.

### 16.5 E2E e visual

- desktop 1440 e 1280;
- tablet 768;
- mobile 390 e 375;
- busca, filtros, folha/painel, inclusao e salvamento;
- navegacao com rascunho sujo;
- Free, Pro e Ultimate;
- empresa sem UF;
- release indisponivel e antiga;
- sem overflow, zoom inicial, texto cortado ou acao coberta;
- screenshots revisadas e erros do navegador iguais a zero.

### 16.6 Regressao

- lint;
- typecheck;
- testes unitarios completos;
- build;
- audit de dependencias;
- E2E atual de cadastro, login, catalogo, orcamento, obra e planos;
- nenhuma chamada Asaas durante os testes SINAPI.

## 17. Rollout

### Fase 1 - Fundacao escondida

- migrations, tipos, parser, fixtures, importador e testes de banco;
- feature flag desligada;
- nenhuma mudanca comercial.

### Fase 2 - Dados reais e consulta interna

- importar uma competencia oficial real;
- revisar contagens e amostras contra o XLSX;
- liberar busca apenas em ambiente controlado;
- medir desempenho e corrigir parser/indices.

### Fase 3 - Catalogo

- aba SINAPI;
- selecao e acrescimo;
- snapshot no catalogo;
- QA desktop/mobile.

### Fase 4 - Orcamento

- seletor no editor;
- snapshot na RPC atomica;
- protecao de rascunho;
- PDF e duplicacao verificados.

### Fase 5 - Gate Ultimate

- importar segunda competencia ou retificacao controlada;
- concluir operacao mensal;
- executar suite completa e smoke de producao;
- ligar feature flag;
- somente entao atualizar Planos, Precos, landing e documentacao comercial.

Cada fase deve gerar commit isolado e reversivel. A feature flag permite publicar
o codigo antes de expor o recurso.

## 18. Compatibilidade e migracao

- todos os novos campos em `catalog_items` e `quote_items` sao opcionais;
- itens existentes continuam validos e sem fonte;
- nenhuma backfill inventa origem SINAPI;
- o catalogo CSV continua importando itens proprios sem selo oficial;
- `replace_quote_items` permanece atomica e ganha validacao apenas quando
  `sinapi_entry_id` estiver presente;
- a migracao nao altera planos ou assinaturas existentes;
- nenhuma tabela Asaas e modificada;
- nenhum webhook e modificado;
- rollback de interface ocorre pela feature flag;
- dados publicados permanecem para auditoria mesmo com a flag desligada.

## 19. Criterios de aceite

1. Uma release oficial pode ser analisada sem escrita por dry run.
2. Uma release invalida nunca fica pesquisavel.
3. Uma retificacao nao altera snapshots antigos.
4. Ultimate encontra referencias por codigo e descricao, com UF e competencia.
5. Free e Pro sao bloqueados no banco e continuam usando o catalogo normal.
6. Ausencia de preco nunca aparece como R$ 0,00.
7. O usuario ve custo oficial, fonte e preco final como conceitos diferentes.
8. O servidor impede falsificacao dos campos oficiais.
9. Itens SINAPI podem ser salvos no catalogo e no orcamento.
10. O editor preserva rascunho e nao perde dados ao abrir o seletor.
11. Mobile 375/390 nao apresenta zoom, overflow ou acao coberta.
12. Busca atende a meta de desempenho com volume representativo.
13. Falha de importacao mantem a ultima publicacao valida.
14. A suite atual continua verde e o fluxo Asaas nao e tocado.
15. Nenhuma promessa comercial e publicada antes do gate da Fase 5.

## 20. Evolucao posterior

O ciclo `SINAPI Analitico` podera adicionar:

- arvore e memoria de composicao;
- coeficientes e produtividades;
- separacao de materiais, mao de obra e equipamentos;
- encargos e custos horarios explicados;
- substituicoes locais;
- BDI;
- curva ABC;
- comparacao entre competencias;
- atualizacao assistida com diff, sempre opt-in.

Essa evolucao depende de uso real da busca e dos snapshots. Ela nao e requisito
para o SINAPI Profissional V1 gerar valor comercial com seguranca.
