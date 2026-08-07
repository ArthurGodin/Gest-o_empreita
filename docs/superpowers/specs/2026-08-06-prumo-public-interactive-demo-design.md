# Prumo: demonstracao publica interativa

**Data:** 06/08/2026  
**Status:** desenho aprovado para implementacao

## Objetivo

Permitir que uma pessoa conheca o fluxo real do Prumo antes de criar conta,
usando uma experiencia publica, interativa, responsiva e completamente isolada
dos dados e das operacoes do SaaS autenticado.

A demonstracao deve aumentar confianca e conversao sem expor Supabase, contas
demo existentes, tokens publicos, dados pessoais ou qualquer caminho financeiro.

## Contexto atual

O Prumo ja possui uma central autenticada para workspaces `demo`, cenarios por
segmento, recursos Ultimate e bloqueios de cobranca no servidor. Essa estrutura
serve para avaliadores que receberam uma conta, mas nao para visitantes anonimos:
ela exige login, consulta dados reais do Supabase e permite explorar telas que
normalmente possuem escrita.

A nova rota nao substitui essa central. Ela resolve outra etapa do funil:
experimentar o produto com seguranca antes do cadastro.

## Abordagens consideradas

1. Abrir anonimamente um workspace demo real. Entrega fidelidade maxima, mas
   aumenta o risco de vazamento, disputa de estado e operacoes esquecidas.
2. Criar um tour com capturas de tela. E seguro e simples, mas parece uma
   apresentacao e nao permite compreender o fluxo do produto.
3. Criar uma demonstracao interativa isolada, com dados tipados no codigo e
   componentes de leitura inspirados nas telas reais. Esta e a abordagem
   escolhida por combinar seguranca, autonomia e sensacao de produto utilizavel.

## Rota e descoberta

- A experiencia sera publicada em `/demo`.
- Nao exigira login e nao redirecionara visitantes autenticados.
- A landing recebera um link terciario compacto `Explorar demonstracao`.
- Cadastro e precos continuam sendo os dois CTAs comerciais principais.
- O cabecalho da demo oferece `Criar conta` e acesso aos planos.
- A rota usa `robots: noindex, follow`, mantendo a landing como destino
  principal dos buscadores sem impedir compartilhamento do link.

## Experiencia

A pessoa entra diretamente em uma interface de produto, sem hero comercial e
sem tutorial modal. O primeiro cenario e Arquitetura, alinhado ao publico
prioritario atual.

Um seletor compacto permite alternar entre:

- Arquitetura;
- Design de interiores;
- Engenharia;
- Execucao de obras.

Cada perfil apresenta um conjunto coerente de dados ficticios. Ao trocar o
perfil, a demonstracao retorna para a visao geral daquele cenario.

O roteiro principal possui cinco areas:

1. `Visao geral`: cliente, valor, prazo, progresso e proxima entrega.
2. `Proposta`: escopo, itens, total, status e perspectiva do cliente.
3. `Projeto`: etapas, andamento, briefing ou diario conforme o perfil.
4. `Entregas`: versoes, situacao de aprovacao e retorno ficticio do cliente.
5. `Financeiro`: contratado, recebido, custos, saldo e margem estimada.

Arquitetura e Interiores incluem briefing e ambientes. Engenharia destaca
registros e etapas tecnicas. Obras destaca execucao, custos e diario resumido.

## Interacoes

A demonstracao permite apenas:

- trocar perfil;
- mudar de area;
- expandir detalhes;
- alternar entre perspectiva interna e perspectiva do cliente;
- abrir cadastro ou precos.

Nao existirao campos editaveis, upload, envio, aprovacao persistente, geracao de
PDF, Pix, boleto, checkout ou botoes que aparentem salvar dados.

O estado existe somente na memoria do componente. Recarregar a pagina restaura
Arquitetura e Visao geral.

## Direcao visual

A pagina reutiliza os tokens de cor, tipografia, bordas, icones e densidade do
Prumo. O resultado deve parecer uma superficie real do produto, mas possuir uma
identificacao persistente `Demonstracao protegida`.

- Cabecalho compacto com marca, aviso de demo e CTAs.
- Navegacao lateral em desktop e faixa horizontal rolavel em mobile.
- Conteudo operacional, sem cards dentro de cards e sem areas vazias grandes.
- Numeros alinhados e formatados como moeda brasileira.
- Estados e status usam texto e icone, nao apenas cor.
- Movimento curto em troca de area, removido com movimento reduzido.
- Nenhum efeito 3D, imagem pesada ou animacao decorativa continua.

## Arquitetura

### Unidades

- `app/demo/page.tsx`: server component estatico, metadata e composicao publica.
- `app/demo/public-demo-client.tsx`: estado de perfil, area e detalhes locais.
- `lib/public-demo.ts`: tipos, cenarios, formatacao derivada e fallbacks puros.
- Componentes de visualizacao: shell, resumo, proposta, projeto, entregas e
  financeiro.

Cada componente recebe dados prontos por propriedades. Nenhum componente visual
consulta banco ou decide permissao.

### Isolamento

A arvore de `/demo` nao pode importar:

- cliente Supabase;
- server actions;
- consultas autenticadas;
- bibliotecas de Asaas;
- dados da central `/app/demonstracao`;
- cookies, membership ou empresa ativa.

O middleware tera uma excecao exata para `/demo` e seus descendentes antes da
criacao do cliente Supabase. Outros caminhos preservam o comportamento atual.

O HTML e os cenarios podem ser gerados no build. A interatividade hidrata apenas
o componente cliente da demonstracao.

## Dados ficticios

Cada cenario contem:

- perfil e vocabulario;
- cliente com nome obviamente ficticio e sem contato real;
- proposta com itens, quantidades e valores;
- projeto, prazo, etapas e percentual de conclusao;
- entregas e estados de aprovacao;
- totais financeiros relacionados.

As invariantes devem ser verificaveis:

- total da proposta e igual a soma dos itens;
- saldo a receber e contratado menos recebido;
- margem estimada e contratado menos custos;
- percentuais ficam entre 0 e 100;
- IDs sao identificadores locais sem formato de token real;
- nao existem CPF, CNPJ, telefone, e-mail, chave Pix ou URL externa de cliente.

## Analytics

Eventos sem dados pessoais:

- `public_demo_opened`;
- `public_demo_profile_changed`;
- `public_demo_section_viewed`;
- `public_demo_cta_clicked`.

As propriedades ficam limitadas a perfil, area e destino do CTA. Falha de
analytics e silenciosa e nunca altera navegacao ou renderizacao.

## Acessibilidade e responsividade

- Botoes nativos e foco visivel.
- Perfil e area ativos usam `aria-pressed` ou semantica equivalente.
- Titulos mantem hierarquia logica.
- Status combinam icone e texto.
- Alvos de toque possuem no minimo 44 px.
- A faixa de navegacao mobile pode rolar horizontalmente sem ampliar a pagina.
- Nenhum elemento fixo cobre conteudo ou a area segura do celular.
- `prefers-reduced-motion` remove transicoes nao essenciais.
- Sem JavaScript, o resumo inicial e os links comerciais continuam visiveis.

Viewports de referencia:

- 360 x 800;
- 390 x 844;
- 768 x 1024;
- 1440 x 900.

## Falhas seguras

- Perfil desconhecido: Arquitetura.
- Area desconhecida: Visao geral.
- Cenario incompleto em desenvolvimento: teste falha antes do build.
- Analytics indisponivel: interacao continua normalmente.
- JavaScript indisponivel: resumo estatico e CTAs permanecem.
- Supabase ou Asaas fora do ar: a demo continua funcionando, pois nao os chama.

## Testes

### Unidade

- quatro cenarios completos;
- fallback de perfil e area;
- soma de itens e totais financeiros;
- percentuais validos;
- ausencia de dados com formato sensivel;
- eventos aceitos pelo contrato de analytics.

### Integracao e seguranca

- `/demo` nao exige autenticacao;
- middleware nao cria cliente Supabase para `/demo`;
- imports da arvore publica nao alcancam Supabase, Asaas ou server actions;
- landing aponta para `/demo` sem substituir cadastro e precos.

### Navegador

- navegar pelas cinco areas;
- trocar os quatro perfis;
- confirmar uma unica area ativa;
- validar perspectiva do cliente;
- confirmar CTAs de cadastro e precos;
- monitorar rede e comprovar ausencia de Supabase e Asaas;
- verificar teclado, movimento reduzido, mobile e desktop;
- confirmar ausencia de overflow horizontal e erros de console.

### Gates

- testes focados e suite relevante;
- lint;
- typecheck;
- build de producao;
- QA visual;
- smoke publico em producao sem login.

## Fora de escopo

- acesso anonimo ao workspace demo autenticado;
- leitura de dados do Supabase;
- gravacao local persistente;
- formularios funcionais;
- geracao real de PDF;
- chamadas Asaas;
- compartilhamento de estado por URL;
- novo plano ou alteracao de preco;
- substituicao da central autenticada existente;
- tour com pop-ups ou video automatico.

## Rollout e rollback

A implementacao entra em commits isolados. Depois dos gates locais, o deploy deve
ficar `Ready` e `/demo` sera validado no dominio principal.

O rollback remove o link da landing, a rota e a excecao exata do middleware. Nao
ha migration, dado persistente ou alteracao financeira para desfazer.

## Criterios de aceite

- `/demo` abre sem login em mobile e desktop;
- Arquitetura e o cenario inicial e os quatro perfis funcionam;
- cinco areas apresentam dados coerentes e recursos reais do Prumo;
- nenhuma acao aparenta escrever ou cobrar;
- nenhuma requisicao para Supabase ou Asaas ocorre;
- landing preserva cadastro e precos e oferece o link da demo;
- acessibilidade, responsividade e movimento reduzido passam no QA;
- testes, lint, typecheck e build passam;
- deploy de producao e smoke anonimo concluem sem erro.
