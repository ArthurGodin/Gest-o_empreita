# Prumo Entregaveis Versionados

Data: 23 de julho de 2026
Status: aprovado para implementacao

## Objetivo

Adicionar ao Prumo um fluxo profissional de entregas de projeto que permita:

- organizar entregaveis por projeto e por etapa;
- publicar PDFs, imagens ou links externos;
- preservar o historico de versoes;
- receber aprovacao ou pedido de ajustes do cliente;
- impedir que um aceite final seja registrado antes das revisoes pendentes;
- manter o uso simples no celular e sem exigir conta do cliente.

O modulo atende arquitetura, design de interiores, engenharia e execucao de
obras. Ele complementa as etapas e o diario existentes, sem substituir a
revisao de propostas que o Prumo ja possui.

## Fora do escopo

Esta versao nao inclui:

- editor ou visualizador de DWG, RVT, BIM ou CAD;
- anotacao grafica sobre pranchas;
- chat em tempo real;
- tarefas atribuidas ao cliente;
- upload de referencias pelo cliente;
- assinatura com certificado ICP-Brasil;
- armazenamento interno de arquivos tecnicos pesados;
- aprovacao automatica por ausencia de resposta.

Arquivos pesados serao compartilhados por link HTTPS de Drive, OneDrive ou
outro provedor escolhido pelo profissional.

## Decisoes de produto

### Unidade de trabalho

Um entregavel representa um item permanente do projeto, como "Anteprojeto",
"Caderno executivo" ou "Relatorio de vistoria". Ele pode ser associado a uma
etapa, mas essa associacao e opcional.

Cada entregavel possui versoes numeradas. Uma versao publicada e imutavel.
Alteracoes posteriores exigem uma nova versao.

### Estados apresentados

O estado exibido e derivado da versao publicada mais recente:

- `Rascunho`: ainda nao existe versao publicada;
- `Aguardando cliente`: versao publicada sem decisao;
- `Ajustes solicitados`: cliente devolveu a versao com comentario;
- `Aprovado`: cliente aprovou a versao;
- `Arquivado`: entregavel retirado do fluxo ativo, com historico preservado.

Se houver uma nova versao em rascunho depois de um pedido de ajustes, a
interface deve exibir as duas informacoes, por exemplo:
`Ajustes solicitados · v2 em rascunho`.

### Revisao

Cada versao publicada recebe no maximo uma decisao:

- aprovacao, com nome do cliente;
- pedido de ajustes, com nome e comentario obrigatorio.

Depois da decisao, a versao permanece congelada. Um novo ciclo exige uma nova
versao. Nao existe conversa em formato de chat nesta primeira versao.

### Aceite final e cobranca

Aprovacao de entregavel nao libera cobranca automaticamente.

O aceite final existente continua explicito e exige que o projeto esteja
concluido. Quando houver entregaveis publicados, todas as versoes publicadas
atuais precisam estar aprovadas antes de o aceite final aparecer.

Entregaveis apenas em rascunho nao bloqueiam o aceite porque nunca foram
apresentados ao cliente. Projetos sem entregaveis preservam o comportamento
atual. Entregaveis arquivados tambem nao bloqueiam o aceite, mas continuam
visiveis no historico interno.

O nome informado no aceite final deve passar a ser armazenado. Aceites antigos
sem nome permanecem validos e devem ser apresentados como registros anteriores
ao historico detalhado.

## Experiencia interna

### Posicao na tela

A pagina do projeto ganha uma secao `Entregas` entre `Etapas` e `Cobranca`.
O navegador de secoes do projeto tambem recebe esse destino.

### Lista

A lista deve ser compacta e adequada a leitura recorrente. Cada linha mostra:

- titulo;
- etapa associada, quando houver;
- versao publicada atual;
- estado;
- data da ultima atividade;
- acao principal coerente com o estado.

Acoes secundarias ficam em menu ou expansao, evitando uma fileira de botoes.

### Primeiro uso

O estado vazio deve explicar apenas a proxima acao:

> Publique plantas, relatorios, imagens ou links e receba o retorno do cliente.

A acao primaria sera `Adicionar entrega`.

### Criacao

O formulario solicita:

- titulo;
- descricao opcional;
- etapa opcional;
- origem: arquivo ou link;
- nota da versao opcional.

Para arquivo, sao aceitos PDF, JPG, PNG e WEBP. Para link, somente HTTPS sem
credenciais embutidas.

O entregavel nasce como rascunho. O profissional revisa os dados e usa
`Publicar versao` em uma confirmacao explicita.

### Nova versao

Depois de um pedido de ajustes, a acao principal sera `Criar nova versao`.
Titulo, descricao e etapa permanecem; o profissional informa o novo arquivo ou
link e uma nota de alteracao.

Uma versao publicada nao pode ser substituida. Rascunhos podem ser removidos.
Entregaveis publicados podem ser arquivados, mas nao apagados silenciosamente.

### Compartilhamento

Depois da publicacao, o Prumo oferece:

- copiar link do portal;
- compartilhar mensagem pronta pelo WhatsApp;
- opcionalmente avisar por e-mail quando o cliente tiver e-mail cadastrado.

O envio por e-mail exige acao explicita do profissional. Falha de notificacao
nao desfaz a publicacao.

## Experiencia publica

### Navegacao

Projetos com entregaveis exibem quatro abas:

- Andamento;
- Entregas;
- Cobranca;
- Proposta ou Orcamento, conforme o perfil.

As quatro abas devem caber em 360 px sem rolagem horizontal. Icones e textos
usam dimensoes compactas e alvos de toque adequados.

Se houver cobranca vencida ou disponivel, `Cobranca` continua prioritaria. Sem
cobranca acionavel, uma versao aguardando cliente torna `Entregas` a aba
inicial. Nos demais casos, a aba inicial continua `Andamento`.

### Conteudo

A aba mostra somente entregaveis ativos com versao publicada. Cada item exibe:

- titulo e etapa;
- versao atual;
- nota de publicacao;
- data;
- botao para visualizar ou abrir;
- decisao atual;
- historico recolhido de versoes anteriores.

Arquivos internos usam URL assinada de curta duracao. Links externos abrem em
outra aba com `noopener` e `noreferrer`.

### Aprovacao

Para aprovar, o cliente informa o nome e confirma que revisou a versao.

Para solicitar ajustes, informa o nome e um comentario entre 10 e 2.000
caracteres. A interface deixa claro que uma nova versao sera enviada depois.

As acoes sao idempotentes. Uma segunda tentativa causada por toque duplo ou
reenvio de rede retorna a decisao ja registrada, sem duplicar o historico.

## Planos e limites

Todos os planos experimentam o fluxo completo de versao e aprovacao. A
diferenciacao acontece por capacidade, sem esconder o funcionamento principal.

### Gratis

- ate 3 entregaveis ativos por projeto;
- ate 25 MB de arquivos internos por empresa;
- versoes, links externos e decisoes do cliente incluidos.

### Pro

- ate 200 entregaveis ativos por projeto;
- ate 1 GB de arquivos internos por empresa;
- tudo que existe no Gratis.

### Ultimate

- ate 500 entregaveis ativos por projeto;
- ate 5 GB de arquivos internos por empresa;
- tudo que existe no Pro.

### Regras gerais

- arquivo individual de ate 15 MB;
- links externos nao consomem bytes, mas contam como entregaveis;
- todas as versoes internas prontas contam na quota, inclusive historicas;
- reservas de upload em andamento tambem contam para evitar uploads
  concorrentes acima da quota;
- limites sao verificados no servidor antes de autorizar o upload ou criar o
  link;
- a interface mostra consumo e limite sem usar a palavra `ilimitado`.

Planos, landing e Central de Ajuda so devem anunciar o modulo depois de todos os
bloqueios estarem funcionais.

## Modelo de dados

### `project_deliverables`

Representa o item logico:

- `id`;
- `company_id`;
- `project_id`;
- `stage_id`, opcional;
- `title`;
- `description`, opcional;
- `position`;
- `archived_at`, opcional;
- `created_by`;
- `created_at`;
- `updated_at`.

Restricoes garantem titulo e descricao limitados, etapa pertencente ao mesmo
projeto e posicao nao negativa.

### `project_deliverable_versions`

Representa cada revisao:

- `id`;
- `company_id`;
- `project_id`;
- `deliverable_id`;
- `version_number`;
- `source_kind`: `file` ou `external_link`;
- `upload_state`: `pending` ou `ready`;
- `storage_path`, quando arquivo;
- `external_url`, quando link;
- `file_name`, `mime_type`, `expected_size_bytes` e `size_bytes`;
- `change_note`, opcional;
- `published_at`, opcional;
- `created_by`;
- `created_at`.

Restricoes:

- numero de versao unico e positivo por entregavel;
- no maximo um rascunho por entregavel;
- arquivo e link sao mutuamente exclusivos;
- links usam HTTPS e nao aceitam usuario ou senha na URL;
- versao publicada precisa estar pronta;
- versao publicada nao pode ser alterada;
- `company_id`, `project_id` e `deliverable_id` precisam formar a mesma cadeia
  de propriedade.

### `project_deliverable_reviews`

Registra a decisao imutavel:

- `id`;
- `company_id`;
- `project_id`;
- `deliverable_id`;
- `version_id`;
- `action`: `approved` ou `changes_requested`;
- `signer_name`;
- `comment`, obrigatorio para ajustes;
- `created_at`.

Existe no maximo uma revisao por versao. Somente a versao publicada atual pode
receber decisao publica.

### `project_delivery_acceptances`

Registra o aceite final:

- `id`;
- `company_id`;
- `project_id`, unico;
- `signer_name`;
- `accepted_at`;
- `share_token_fingerprint`.

O token bruto nao e copiado para a nova tabela. O campo legado
`projects.delivery_approved_token` deixa de receber novos valores, mas nao e
removido nesta versao para manter compatibilidade. A mesma transacao continua
preenchendo `projects.delivery_approved_at`, pois o fluxo de cobranca atual usa
esse campo.

## Seguranca e autorizacao

Todas as tabelas usam RLS por `company_id`, seguindo as politicas tenant-scoped
existentes. Usuarios autenticados so acessam empresas das quais participam.

O bucket `project-deliverables` e privado e nao possui leitura publica direta.

No portal, as operacoes usam cliente administrativo somente depois de:

1. validar sintaxe e tamanho do token;
2. buscar a proposta por comparacao exata do token;
3. confirmar o projeto vinculado;
4. confirmar que entregavel, versao e revisao pertencem ao mesmo projeto;
5. limitar os campos retornados ao contrato publico.

O download autenticado valida a empresa ativa. O download publico valida o
token e responde com redirecionamento para URL assinada curta, sem transmitir o
arquivo pela funcao Vercel.

## Upload direto

O limite de payload de uma Vercel Function e 4,5 MB. Por isso o arquivo nao
passa pelo servidor Next.js.

Fluxo:

1. navegador envia metadados para uma action autenticada;
2. servidor valida empresa, projeto, plano, quota, MIME e tamanho esperado;
3. servidor cria a versao pendente com caminho unico;
4. servidor gera token de upload assinado para o caminho;
5. navegador envia diretamente ao Supabase Storage;
6. navegador chama a finalizacao;
7. servidor consulta os metadados reais do objeto;
8. servidor rejeita e remove objeto invalido ou marca a versao como pronta.

Upload interrompido permanece como rascunho pendente e pode ser repetido ou
removido. Ele nunca aparece no portal publico.

Referencias:

- https://vercel.com/docs/functions/limitations
- https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl
- https://supabase.com/docs/guides/storage/serving/downloads

## Consistencia e concorrencia

Publicacao e revisao usam funcoes transacionais no banco:

- publicacao bloqueia o entregavel, confirma que a versao e o unico rascunho
  pronto e registra `published_at`;
- revisao bloqueia a versao, confirma que ela ainda e a atual e insere a
  decisao uma unica vez;
- aceite final bloqueia o projeto, confirma status concluido e ausencia de
  revisoes pendentes, registra o aceite e so entao libera o fluxo de saldo.

Indices e constraints continuam sendo a ultima barreira contra duplicidade.
Erros de concorrencia retornam mensagem de estado atualizado e pedem recarga,
sem expor detalhes do banco.

## Notificacoes e pendencias

Eventos:

- versao publicada;
- entregavel visualizado pela primeira vez, quando viavel sem excesso de
  escrita;
- entregavel aprovado;
- ajustes solicitados;
- nova versao publicada;
- aceite final registrado.

O proprietario recebe e-mail em aprovacao e pedido de ajustes. A publicacao
oferece envio explicito ao cliente. Falha de e-mail e registrada, mas nao
reverte a operacao principal.

O centro de pendencias recebe:

- `Ajustes solicitados`, prioridade alta;
- `Aguardando cliente` por mais de tres dias, prioridade media;
- upload pendente por mais de um dia, prioridade baixa e visivel apenas
  internamente.

## Observabilidade

Logs estruturados nao incluem token, URL assinada ou nome do arquivo completo.
Devem incluir somente identificadores internos, plano, tamanho, MIME e resultado.

Eventos de produto medem:

- criacao de entregavel;
- inicio, conclusao e falha de upload;
- publicacao;
- abertura publica;
- aprovacao;
- pedido de ajustes;
- criacao de nova versao;
- bloqueio por quota;
- aceite final.

## Tratamento de erros

- metadados invalidos falham antes do upload;
- objeto divergente do tamanho ou MIME declarado e removido;
- falha de finalizacao deixa rascunho recuperavel;
- falha de e-mail nao altera estado salvo;
- link externo invalido nunca e publicado;
- tentativa publica com token ou relacao incorreta responde como recurso nao
  encontrado;
- quota excedida informa consumo, limite e alternativa de link externo;
- decisao repetida retorna o resultado existente;
- falha de Storage nao cria versao publicada.

## Testes

### Unidade

- derivacao de estados;
- limites por plano;
- MIME, tamanho e URL externa;
- calculo de quota com uploads pendentes;
- regra de aceite final;
- mensagens e vocabulario por perfil.

### Banco e integracao

- RLS entre duas empresas;
- etapa de outro projeto rejeitada;
- versao publicada imutavel;
- um rascunho por entregavel;
- uma decisao por versao;
- concorrencia em publicacao e revisao;
- upload direto e finalizacao;
- URLs assinadas privadas;
- aceite final bloqueado e liberado corretamente.

### E2E

1. profissional cria projeto e entregavel;
2. envia PDF diretamente ao Storage;
3. publica v1;
4. cliente abre no celular e solicita ajustes;
5. profissional cria e publica v2;
6. cliente aprova;
7. projeto e concluido;
8. cliente registra aceite final;
9. cobranca de saldo segue o fluxo existente.

Tambem devem existir cenarios de link externo, limite Gratis e isolamento entre
empresas.

### Qualidade visual

QA em 360x800, 390x844, 768x1024 e 1440x900:

- lista interna;
- criacao e upload;
- historico;
- portal publico com quatro abas;
- formularios de aprovacao e ajustes;
- estados vazios, erro, carregamento e quota.

## Rollout

1. aplicar migracao aditiva e criar bucket privado;
2. publicar backend compativel sem anunciar o recurso;
3. validar upload, download e RLS em preview;
4. ativar interface interna;
5. validar portal publico e aceite final;
6. atualizar planos, landing e ajuda;
7. liberar em producao;
8. acompanhar falhas de upload, pedidos de ajustes e consumo de Storage.

Rollback visual pode esconder a interface sem remover dados. As tabelas e o
bucket permanecem para preservar versoes ja publicadas.

## Criterios de aceite

O modulo esta pronto quando:

- arquivo de 15 MB chega ao Storage sem passar pela funcao Vercel;
- nenhum arquivo privado abre sem empresa autenticada ou token valido;
- cliente revisa pelo celular sem login;
- historico nao pode ser reescrito;
- bloqueios de plano funcionam no servidor;
- aceite final nao ignora revisao pendente;
- nome do aceite final fica registrado;
- planos prometem exatamente os limites implementados;
- typecheck, testes, lint, build e E2E passam;
- QA mobile e desktop nao apresenta overflow ou controles inacessiveis.
