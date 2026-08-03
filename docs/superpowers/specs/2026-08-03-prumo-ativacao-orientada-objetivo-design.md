# Prumo - Ativacao orientada por objetivo

Data: 3 de agosto de 2026  
Status: desenho aprovado; implementação concluída e em validação

## 1. Objetivo

Transformar o primeiro acesso ao Prumo em um caminho curto e contextual, no
qual cada profissional informa o que precisa resolver e chega a uma primeira
entrega real sem depender de suporte humano.

O lote deve aproveitar recursos que ja existem, principalmente perfis
profissionais, modelos de proposta, projetos, briefings, ambientes, etapas,
entregas e gestao. O foco nao e adicionar um tutorial promocional, mas tornar
visivel e utilizavel o valor que o produto ja entrega.

## 2. Diagnostico atual

O Prumo ja possui:

- quatro segmentos: Arquitetura, Interiores, Engenharia e Execucao de obras;
- vocabulario contextual por segmento;
- tres modelos de proposta ou orcamento por segmento;
- modelos de etapas;
- workspace de projeto com Resumo, Etapas, Entregas e Gestao;
- Briefing e Ambientes para Arquitetura e Interiores;
- checklist de ativacao ate o primeiro recebimento;
- limites atomicos para projetos ativos no plano Gratis;
- separacao entre workspaces live e demo;
- protecoes para checkout, Asaas e cobrancas externas.

Os principais problemas sao:

- o onboarding coleta o perfil, mas nao pergunta o objetivo imediato;
- o guia atual presume que todo trabalho comeca por uma proposta aprovada;
- um profissional que ja possui trabalho contratado precisa simular um fluxo
  comercial que aconteceu fora do Prumo;
- Briefing, Ambientes e Entregas so ficam evidentes depois que o usuario
  atravessa varias dependencias;
- o mesmo checklist longo atende intencoes diferentes.

## 3. Decisao de produto

O onboarding passara a ter duas etapas:

1. perfil profissional e identificacao do negocio;
2. objetivo inicial contextual ao segmento.

O objetivo sera persistido na empresa e determinara apenas orientacao,
linguagem, destino inicial e progresso. Ele nao altera plano, permissoes,
limites ou dados existentes.

Os objetivos internos serao:

| Codigo | Uso |
| --- | --- |
| `sell` | Conseguir um novo contrato por proposta ou orcamento |
| `existing_project` | Organizar um trabalho ja contratado |
| `client_briefing` | Coletar informacoes do cliente em Arquitetura ou Interiores |
| `deliverables` | Preparar e acompanhar entregas em Engenharia |
| `execution_control` | Controlar execucao, registros e custos de obra |

Cada segmento exibira exatamente tres escolhas:

| Segmento | Escolha 1 | Escolha 2 | Escolha 3 |
| --- | --- | --- | --- |
| Arquitetura | Conseguir novo projeto | Organizar projeto contratado | Enviar briefing ao cliente |
| Interiores | Conseguir novo projeto | Organizar projeto contratado | Enviar briefing ao cliente |
| Engenharia | Conseguir novo servico | Organizar servico contratado | Preparar entregas tecnicas |
| Execucao de obras | Conseguir nova obra | Organizar obra contratada | Controlar execucao e custos |

Empresas antigas com objetivo nulo usarao `sell` como comportamento efetivo,
sem tela bloqueante ou repeticao do onboarding.

## 4. Alternativas consideradas

### 4.1. Personalizar somente textos e atalhos

Seria a menor mudanca, mas manteria o bloqueio para trabalhos contratados fora
do Prumo e continuaria escondendo Briefing, Entregas e Gestao atras do fluxo de
aprovacao.

### 4.2. Objetivo contextual e cadastro direto de trabalho contratado

Adiciona uma entrada legitima para trabalhos existentes, preserva o funil de
vendas atual e conduz cada perfil ao recurso que gera valor mais cedo.

Esta e a alternativa escolhida.

### 4.3. Assistente completo em modal com todas as configuracoes

Concentraria cliente, proposta, projeto, cobranca e configuracoes em um wizard
grande. Isso duplicaria telas operacionais, aumentaria risco de perda de estado
e tornaria o primeiro acesso mais cansativo no celular.

## 5. Escopo funcional

### 5.1. Onboarding em duas etapas

A primeira etapa preserva os campos atuais:

- segmento;
- nome profissional ou da empresa;
- WhatsApp comercial;
- cidade;
- UF.

A segunda etapa mostra somente os tres objetivos validos para o segmento
selecionado. O usuario pode voltar sem perder os campos preenchidos.

Novos cadastros exigem uma escolha. O servidor valida se o objetivo pertence ao
segmento antes de criar a empresa.

Quando o cadastro vier de um plano pago, o objetivo sera salvo antes do
redirecionamento ao checkout. O fluxo do Asaas e seus retornos nao serao
alterados neste lote. Ao voltar ao app, o objetivo persistido orientara o
painel.

No plano Gratis, o destino inicial sera:

- `sell`: cadastro de cliente preparado para seguir a uma proposta;
- demais objetivos: novo cadastro direto de projeto ou obra.

### 5.2. Cadastro direto de trabalho contratado

Sera criada a rota autenticada `/app/obras/novo`. O titulo e a linguagem serao
adaptados para projeto, servico ou obra.

O formulario tera tres blocos compactos:

1. cliente existente ou novo cliente;
2. dados essenciais do trabalho;
3. ponto de partida operacional.

Dados essenciais do trabalho:

- nome;
- descricao opcional;
- endereco opcional;
- estado inicial: planejamento ou em execucao;
- inicio e termino opcionais;
- valor contratado ou previsto opcional;
- modelo de etapas opcional.

O ponto de partida determina apenas o redirecionamento apos a criacao:

- `existing_project`: Etapas;
- `client_briefing`: Briefing;
- `deliverables`: Entregas;
- `execution_control`: Gestao, com foco em Custos.

O cadastro direto nao cria proposta retroativa, aprovacao ficticia, cobranca,
Pix, boleto, cliente no Asaas ou qualquer outro efeito financeiro externo.

### 5.3. Guia de ativacao por objetivo

O painel substituira o caminho unico por trilhas derivadas dos dados reais.

`sell`:

1. cliente cadastrado;
2. proposta ou orcamento criado;
3. link compartilhado;
4. aceite registrado.

`existing_project`:

1. cliente cadastrado;
2. projeto ou obra criado diretamente;
3. primeira etapa organizada.

`client_briefing`:

1. cliente cadastrado;
2. projeto criado diretamente;
3. briefing criado;
4. briefing compartilhado.

`deliverables`:

1. cliente cadastrado;
2. projeto criado diretamente;
3. primeira entrega criada.

`execution_control`:

1. cliente cadastrado;
2. obra criada diretamente;
3. primeira etapa organizada;
4. primeiro registro de diario ou custo criado.

O guia termina quando a primeira vitoria do objetivo ocorre. Configuracao de
recebimento, cobranca e demais operacoes continuam disponiveis como proximas
acoes normais do produto, sem alongar o onboarding inicial.

O usuario pode trocar o objetivo pelo proprio guia. A troca recalcula a trilha
com base nos dados existentes e nunca apaga, duplica ou altera registros.
Somente owner e manager podem alterar o objetivo compartilhado da empresa;
foreman e worker visualizam a trilha sem o controle de troca.

### 5.4. Estados vazios e navegacao

Os estados vazios de Clientes, Propostas e Projetos passarao a reconhecer o
objetivo efetivo:

- uma acao principal;
- vocabulario do segmento;
- explicacao de no maximo duas frases;
- nenhum convite para dados ficticios em workspace live;
- nenhum recurso indisponivel anunciado como pronto.

A pagina de Projetos ganhara a acao `Novo projeto`, `Novo servico` ou `Nova
obra`, permitindo que o recurso continue acessivel depois do onboarding.

### 5.5. Link publico de Briefing para projeto direto

Projetos criados diretamente nao possuem proposta nem `quotes.share_token`.
Para que `client_briefing` funcione sem fabricar uma proposta, o projeto direto
recebera um token publico proprio e usara a rota `/p/[token]`.

O primeiro lote dessa rota sera deliberadamente pequeno:

- identificacao da empresa e do projeto;
- Briefing compartilhado;
- salvamento, retomada e envio das respostas;
- estados de link indisponivel, briefing concluido e projeto encerrado.

Ela nao exibira proposta, valores, cobrancas, custos, endereco completo,
anotacoes internas, equipe ou controles administrativos. Projetos originados de
proposta continuarao usando `/q/[token]` sem mudanca de URL ou comportamento.

Owner e manager poderao regenerar o link do projeto. A regeneracao invalida o
token anterior imediatamente e nao altera as respostas do Briefing.

## 6. Interface e responsividade

### 6.1. Onboarding

- indicador discreto `Etapa 1 de 2` e `Etapa 2 de 2`;
- uma coluna no celular e ate tres colunas no desktop para objetivos;
- opcoes com icone, titulo curto e uma frase;
- alvos de toque com pelo menos 44 px;
- tipografia operacional, sem hero ou card promocional;
- botoes Voltar e Continuar em ordem previsivel;
- barra de acao estavel acima da area segura do celular;
- foco levado ao primeiro erro ou ao titulo da nova etapa;
- estado preservado ao voltar entre etapas.

### 6.2. Painel

O guia inicia compacto e mostra:

- nome da trilha;
- progresso;
- proxima acao;
- botao principal;
- controle secundario para trocar o objetivo.

A lista completa abre sob demanda. O guia nao usa modal, tour por pop-ups,
confetes ou elementos que bloqueiem a operacao.

### 6.3. Cadastro direto

- largura estreita e confortavel no desktop;
- campos de texto com no minimo 16 px no mobile para evitar zoom;
- selecao clara entre cliente existente e novo;
- secoes sem cards aninhados;
- resumo da acao antes do envio;
- botao de salvar fixo no mobile sem cobrir campos;
- redirecionamento direto para a area ligada ao objetivo.

## 7. Modelo de dados

### 7.1. `companies.activation_goal`

Coluna textual e opcional com restricao para os cinco codigos definidos.

Uma restricao adicional garantira compatibilidade entre segmento e objetivo:

- `sell` e `existing_project` sao validos em todos os segmentos;
- `client_briefing` somente em Arquitetura e Interiores;
- `deliverables` somente em Engenharia;
- `execution_control` somente em Execucao de obras.

Ao trocar o segmento em Configuracoes, um objetivo incompativel sera alterado
para `sell` na mesma operacao.

### 7.2. Origem e idempotencia do projeto

`projects.creation_source` identificara:

- `quote`: criado a partir de proposta aprovada;
- `direct`: trabalho contratado fora do Prumo;
- `demo`: cenario demonstrativo;
- `legacy`: registro antigo cuja origem nao pode ser comprovada.

A migracao classificara projetos existentes com proposta vinculada como
`quote`; os demais ficarao como `legacy`. Novos fluxos informarao a origem de
forma explicita.

`projects.creation_key` sera opcional e tera indice unico por empresa quando
preenchido. O cadastro direto enviara uma chave UUID por tentativa logica para
impedir duplicacao por duplo toque, retry de rede ou reenvio do navegador.

### 7.3. Receita de projeto direto

Quando nao houver proposta aprovada vinculada, o resumo financeiro usara
`projects.budget_cents` como valor contratado ou previsto. Isso permite margem
e custos coerentes sem fabricar uma proposta antiga.

Esse fallback nao cria cobrancas e nao altera projetos que ja possuem receita
originada de proposta aprovada.

### 7.4. `projects.client_access_token`

Projetos diretos receberao um token URL-safe gerado com 32 bytes aleatorios e
codificado em Base64 URL-safe sem padding. A coluna sera opcional e tera indice
unico quando preenchida.

O token sera gerado no servidor dentro da transacao. Projetos antigos e
projetos por proposta permanecerao com valor nulo. A regeneracao usara uma
Server Action autenticada, confirmara empresa e projeto e substituira o valor
em uma unica operacao.

## 8. Arquitetura tecnica

O lote sera dividido em unidades pequenas:

- `activation goal domain`: codigos, opcoes por segmento, rotulos e destinos;
- `goal picker`: escolha acessivel usada no onboarding e na troca de objetivo;
- `goal-aware activation`: deriva progresso e proxima acao dos dados reais;
- `activation snapshot query`: busca apenas contagens e estados necessarios;
- `direct project schema`: validacao compartilhada do formulario;
- `direct project RPC`: criacao transacional e idempotente;
- `direct project form`: interface autenticada;
- `project source domain`: normalizacao e rotulos internos;
- `public project access`: resolucao segura do token de projeto direto;
- `direct project public page`: pagina publica minima para Briefing;
- `briefing access resolver`: autoriza token de proposta aprovada ou token de
  projeto direto sem duplicar a regra nas consultas e RPCs;
- adaptacoes pontuais no painel, estados vazios e configuracoes.

Componentes visuais nao determinam permissao, plano, empresa ou limite. O
servidor e o banco repetem as validacoes relevantes.

A RPC de cadastro direto sera `security definer`, com `search_path` fixo,
execucao revogada de `public` e `anon` e concedida apenas a `authenticated`.
Ela nao recebera `creation_source`: o proprio procedimento sempre gravara
`direct`. O fluxo de conversao de proposta gravara `quote`, e o kit oficial de
demonstracao gravara `demo`.

A autorizacao publica do Briefing sera centralizada em uma funcao SQL interna
que resolve o token para um unico projeto e tipo de acesso. Ela nao tera
permissao de execucao para `anon` ou `authenticated`; somente as RPCs publicas
de Briefing, com contrato de saida restrito, poderao utiliza-la. A pagina
publica fara a mesma resolucao no servidor com o cliente administrativo e
selecionara apenas os campos permitidos.

## 9. Fluxo de dados do cadastro direto

1. O navegador gera uma `creation_key` e envia dados validados pelo formulario.
2. A Server Action valida sessao, empresa ativa, segmento, objetivo e campos.
3. A RPC adquire um lock transacional para empresa e `creation_key`.
4. A RPC procura um projeto ja criado com a mesma chave e o retorna se existir.
5. A RPC confirma que o usuario pertence a empresa.
6. A RPC valida cliente existente da mesma empresa ou cria o novo cliente.
7. A RPC cria o projeto com origem `direct` e token publico gerado no servidor.
8. O trigger existente aplica o limite atomico de projeto ativo no Gratis.
9. Se houver modelo acessivel, suas etapas sao instanciadas na mesma transacao.
10. A RPC retorna IDs de cliente e projeto.
11. A Server Action revalida as telas e devolve o destino contextual.

Qualquer excecao antes do commit desfaz cliente, projeto e etapas. Nenhuma
operacao externa ocorre nesse fluxo.

## 10. Autorizacao e seguranca

- sessao autenticada obrigatoria;
- membership validada no servidor e dentro da RPC;
- cliente existente precisa pertencer a empresa ativa;
- modelo precisa ser do sistema ou da mesma empresa;
- insercoes continuam submetidas a RLS e triggers de quota;
- `activation_goal` nao concede plano ou recurso;
- `creation_source` e `creation_key` nao serao aceitos livremente do navegador;
- `client_access_token` nunca sera aceito do navegador nem incluido em logs;
- troca de objetivo e regeneracao de link exigem role owner ou manager;
- IDs e chaves de outra empresa serao rejeitados;
- logs nao terao nome, CPF, telefone, email, endereco ou texto do projeto;
- workspaces demo nao executarao efeitos externos, preservando as protecoes
  existentes.

## 11. Tratamento de erros

- Sessao expirada: nao limpar o estado atual da tela e orientar novo login.
- Dados de cliente e projeto nao serao persistidos em `localStorage` ou URL.
- Objetivo invalido para o segmento: rejeitar e mostrar as escolhas validas.
- Cliente de outra empresa: resposta generica de cliente indisponivel.
- Limite Gratis atingido: rollback integral e CTA para planos.
- Modelo removido ou inacessivel: nao criar o projeto e pedir nova selecao.
- Data final anterior ao inicio: erro junto ao campo de termino.
- Valor invalido: erro junto ao campo, sem arredondamento silencioso.
- Falha de rede antes da resposta: permitir tentar novamente com a mesma chave.
- Resposta perdida depois do commit: a mesma chave retorna o projeto existente.
- Falha ao carregar objetivo: usar `sell` como orientacao conservadora.
- Projeto direto sem proposta: mostrar valor previsto e nunca link de proposta
  inexistente.
- Token publico invalido ou regenerado: responder como link indisponivel, sem
  revelar se projeto, empresa ou Briefing existem.
- Projeto concluido ou cancelado: manter Briefing enviado somente para leitura
  e bloquear novas alteracoes.
- `/p/[token]` usara `noindex`, politica de referrer restritiva e respostas sem
  cache compartilhado.

## 12. Eventos e observabilidade

Eventos novos, sem dados pessoais:

- `onboarding_goal_selected`;
- `onboarding_step_viewed`;
- `activation_goal_changed`;
- `activation_goal_next_step_opened`;
- `direct_project_started`;
- `direct_project_created`;
- `direct_project_failed`;
- `activation_goal_completed`.

Propriedades permitidas:

- segmento;
- objetivo;
- plano;
- etapa;
- uso de cliente existente;
- uso de modelo;
- categoria tecnica do erro;
- viewport classificado como mobile ou desktop.

## 13. Testes

### 13.1. Unidade

- tres objetivos corretos por segmento;
- rejeicao de combinacoes invalidas;
- destino apos criacao por objetivo;
- normalizacao de empresa antiga sem objetivo;
- troca de segmento com objetivo incompativel;
- trilhas, progresso e proxima acao;
- validacao de datas e valores;
- fallback de receita para projeto direto.
- escolha entre URL `/q` e `/p` conforme a origem do acesso.

### 13.2. Banco e servidor

- criacao atomica de novo cliente, projeto e etapas;
- reutilizacao de cliente existente;
- rollback quando projeto, limite ou modelo falhar;
- duas requisicoes com a mesma chave retornam um projeto;
- requisicoes concorrentes nao duplicam cliente ou projeto;
- usuario de outra empresa nao acessa cliente, modelo ou projeto;
- limite Gratis permanece atomico;
- Pro e Ultimate preservam seus limites atuais;
- nenhum caminho direto chama Asaas ou cria cobranca;
- projeto por proposta continua com origem `quote`;
- kit demo continua isolado.
- token de projeto direto autoriza somente o projeto correspondente;
- token regenerado deixa de autorizar imediatamente;
- RPCs publicas de Briefing aceitam os dois tipos de token sem misturar
  empresas ou projetos;
- `/p/[token]` nao retorna proposta, cobranca, custo, endereco completo ou
  anotacao interna.

### 13.3. Fluxos completos

1. Arquitetura escolhe proposta, cria cliente e inicia modelo residencial.
2. Interiores escolhe briefing, cria projeto direto e compartilha o briefing.
3. Engenharia escolhe entregas, cria servico direto e registra uma entrega.
4. Obras escolhe controle, cria obra direta e registra etapa e custo.
5. Usuario antigo entra sem interrupcao e usa o fluxo comercial atual.
6. Usuario troca objetivo e o guia reaproveita dados existentes.
7. Usuario do Gratis atinge o limite sem deixar cliente orfao.
8. Reenvio apos falha de rede abre o projeto ja criado.
9. Cliente abre `/p/[token]`, salva, retoma e envia o Briefing pelo celular.
10. Link regenerado invalida o anterior e preserva as respostas.

### 13.4. Gates de qualidade

- typecheck;
- lint sem cache;
- suite completa de testes;
- build de producao;
- QA autenticado em 320x800, 360x800, 390x844, 768x1024 e 1440x900;
- ausencia de zoom inesperado, overflow e sobreposicao com barra mobile;
- navegacao por teclado, foco visivel e leitores de tela;
- smoke de login, onboarding, proposta, PDF, projeto, Briefing, Entregas,
  financeiro, checkout e webhook;
- nenhuma cobranca real durante QA automatizado.

## 14. Rollout

1. Criar migracao aditiva, constraints, backfill e tipos.
2. Implementar dominio de objetivos e testes puros.
3. Implementar RPC transacional e testes de isolamento e idempotencia.
4. Implementar resolucao de acesso publico e `/p/[token]` com testes de
   exposicao de dados.
5. Implementar cadastro direto e trilhas de ativacao.
6. Atualizar onboarding, painel e estados vazios.
7. Executar gates locais e QA visual autenticado e publico.
8. Aplicar migracao em preview e repetir os fluxos completos.
9. Publicar o mesmo commit validado.
10. Aplicar migracao em producao antes de ativar a nova interface.
11. Executar smoke em empresa nova, antiga, Gratis, Pro, Ultimate e demo.
12. Monitorar erros e conclusao por objetivo sem registrar dados pessoais.

O rollback visual pode ocultar a segunda etapa e o cadastro direto. As colunas
sao aditivas, empresas antigas aceitam objetivo nulo e projetos existentes nao
perdem informacao.

## 15. Fora do escopo

Este lote nao inclui:

- visita virtual, fotos 360 ou VR;
- upload de panoramas ou modelos 3D;
- unificacao completa dos portais `/q` e `/p`;
- cobranca, aceite final ou proposta dentro de `/p`;
- criacao automatica de cobrancas em projeto direto;
- importacao em lote;
- mudanca de precos ou promessas dos planos;
- novo sistema de permissoes;
- tour por pop-ups;
- redesign completo do app;
- alteracao do checkout, webhook ou contrato com o Asaas.

## 16. Evolucao de visita visual

A ideia de visita remota e valida, mas tera especificacao e validacao proprias.
A sequencia recomendada e:

1. registro visual organizado por ambiente e data;
2. fotos panoramicas 360 por ambiente, com visualizador web;
3. pontos de navegacao entre ambientes;
4. integracao opcional com captura externa 3D ou VR;
5. avaliacao de custo de armazenamento e posicionamento no Ultimate.

Nenhuma dessas etapas sera anunciada antes de funcionar em mobile e desktop,
com permissao, privacidade e custo operacional definidos.

## 17. Criterios de aceite

O lote estara pronto quando:

- novos usuarios escolherem um objetivo valido em duas etapas curtas;
- cada segmento receber exatamente tres escolhas coerentes;
- usuarios antigos entrarem sem bloqueio;
- o objetivo persistir mesmo quando houver checkout antes do uso do app;
- trabalhos contratados puderem ser cadastrados sem aprovacao ficticia;
- cliente, projeto e etapas forem criados atomicamente;
- retries nao criarem registros duplicados;
- nenhum cadastro direto gerar cobranca ou chamada ao Asaas;
- projeto direto compartilhar Briefing por `/p/[token]` sem proposta ficticia;
- link regenerado revogar o acesso anterior;
- o limite do Gratis continuar garantido pelo banco;
- o painel mostrar uma proxima acao contextual e curta;
- Briefing, Entregas e Gestao ficarem acessiveis no primeiro fluxo relevante;
- troca de objetivo preservar todos os dados;
- projetos diretos tiverem resumo financeiro coerente sem proposta;
- todos os testes e gates de QA passarem;
- landing e precos continuarem prometendo somente recursos publicados.
