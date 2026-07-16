# Prumo: confiabilidade, E2E e recuperacao operacional

Data: 15/07/2026

## Objetivo

Criar uma rede de seguranca reproduzivel para evoluir o Prumo sem quebrar os
fluxos que geram valor: cadastro, onboarding, cliente, orcamento, aceite,
obra, plano e configuracoes. O lote tambem elimina as corridas conhecidas nos
limites do plano Gratis e define um procedimento verificavel de backup e
restauracao.

## Decisao

Os testes de escrita rodarao contra Supabase local e uma instancia local do
Next.js. O faturamento SaaS usara apenas a simulacao permitida fora de
producao. Nenhum teste E2E chamara Asaas de producao, alterara o banco de
producao ou dependera de uma conta pessoal persistente.

Foram descartadas duas alternativas:

- E2E mutavel em producao, porque deixa residuos e pode gerar cobrancas;
- staging completo neste lote, porque exige novos projetos externos antes de
  entregar protecao ao desenvolvimento atual.

Um staging dedicado continua sendo uma evolucao valida quando houver equipe e
volume que justifiquem seu custo operacional.

## Escopo

### Infraestrutura E2E

- Playwright instalado como dependencia de desenvolvimento do `web`.
- Configuracao com projetos Chromium desktop e mobile.
- Servidor Next.js iniciado pelo Playwright com ambiente local explicito.
- Supabase local iniciado antes da suite e resetado pelas migrations.
- Seed minimo e deterministico, sem documentos pessoais reais.
- Evidencias de falha em `test-results`: screenshot, trace e video somente em
  retry/falha.
- Scripts npm separados para execucao local e CI.

### Fluxos automatizados

1. Paginas publicas principais abrem sem erro ou rolagem horizontal.
2. Usuario cria conta, conclui onboarding e chega ao dashboard.
3. Usuario cria cliente e orcamento.
4. Orcamento recebe itens, e enviado e abre pelo link publico.
5. Cliente aprova a proposta sem login e o PDF publico responde corretamente.
6. Orcamento aprovado vira obra sem chamar Asaas real.
7. Plano Gratis bloqueia o quarto orcamento e a segunda obra ativa.
8. Checkout simulado libera plano pago apenas no ambiente local.
9. Configuracoes e logout permanecem acessiveis no mobile.

Os cenarios que dependem da API real do Asaas continuam cobertos por testes
unitarios de webhook e por QA financeiro controlado, nao pela suite E2E.

## Integracao continua

O GitHub Actions ganhara um job E2E separado do quality gate atual:

1. instalar dependencias;
2. iniciar Supabase local;
3. resetar banco e aplicar migrations;
4. expor somente chaves locais geradas pelo CLI;
5. instalar Chromium do Playwright;
6. iniciar Next.js e executar a suite;
7. anexar relatorio e traces quando houver falha;
8. encerrar os containers sempre, inclusive apos erro.

O job nao recebera `ASAAS_API_KEY`, chaves de producao ou service role de
producao. A suite deve falhar de forma clara quando o Docker ou o Supabase
local nao estiverem disponiveis.

## Atomicidade dos limites Gratis

As validacoes atuais fazem `count` e depois `insert`, permitindo que duas
requisicoes simultaneas ultrapassem a cota. A protecao definitiva ficara no
PostgreSQL, cobrindo qualquer caminho de insercao.

Uma migration criara dois triggers `before insert`:

- `quotes`: adquire lock transacional por empresa, consulta o plano e impede
  mais de tres orcamentos no mes civil de `America/Sao_Paulo`;
- `projects`: adquire lock transacional por empresa, consulta o plano e impede
  mais de uma obra com status `planning`, `in_progress` ou `paused`.

Empresas Pro e Ultimate passam sem limite. As mensagens do banco usarao codigos
estaveis, convertidos pelas server actions para os textos comerciais atuais.
As verificacoes antecipadas na aplicacao podem permanecer para feedback
rapido, mas o banco sera a fonte final de verdade.

Os triggers serao testados com transacoes concorrentes no banco local e com os
fluxos de criacao e duplicacao de orcamento.

## Monitoramento de erros

O Prumo ja envia `app_error_boundary` e `global_error_boundary` para a API de
eventos, que registra contexto e dispara alerta operacional. Este lote nao
adicionara um fornecedor externo.

Serao feitos tres ajustes:

- teste automatizado do recebimento e do alerta das duas error boundaries;
- identificador de ocorrencia preservado entre evento, log e alerta;
- documentacao do responsavel, severidade e resposta esperada.

Mensagens, stack traces, documentos, tokens publicos e chaves nao serao
enviados como propriedades de analytics.

## Backup e restauracao

Sera criado um runbook com duas estrategias:

- backup gerenciado/PITR do Supabase, quando habilitado no plano contratado;
- dump logico criptografado em destino privado fora do repositorio.

O procedimento definira:

- RPO inicial de 24 horas;
- RTO inicial de 4 horas;
- verificacao de checksum;
- retencao e acesso minimo;
- restauracao mensal em banco descartavel;
- registro do resultado sem armazenar dados do cliente no Git.

Scripts auxiliares deverao recusar destinos dentro do workspace e nunca
aceitarao senha como argumento versionado. Nenhum backup real sera produzido
automaticamente durante testes ou CI.

## Seguranca e isolamento

- Dados E2E serao ficticios e apagados pelo reset local.
- Tokens de compartilhamento usados nos testes nao serao logados em artefatos.
- O webhook local usara token exclusivo de teste.
- RLS permanecera ativa durante o E2E.
- A service role local sera usada apenas para seed e limpeza controlados.
- Testes paralelos nao compartilharao a mesma empresa quando houver escrita.

## Criterios de aceite

- Suite E2E passa em desktop e mobile localmente e no GitHub Actions.
- Nenhum teste faz requisicao para `api.asaas.com`.
- Quatro criacoes concorrentes no Gratis resultam em exatamente tres
  orcamentos persistidos.
- Duas conversoes concorrentes no Gratis resultam em exatamente uma obra
  ativa.
- Pro e Ultimate nao recebem os bloqueios do Gratis.
- Error boundaries geram evento e alerta sem PII.
- Runbook de backup contem backup, verificacao, restauracao e resposta a
  incidente, sem credenciais.
- `lint`, `typecheck`, testes unitarios, E2E, auditoria e build passam.

## Fora de escopo

- Meta Ads, Pixel e Conversions API;
- compra real ou boleto de teste;
- novo fornecedor de observabilidade;
- staging permanente;
- reformulacao visual ampla;
- mudanca de precos ou recursos dos planos.

## Publicacao

A migration de cotas deve ser aplicada antes do deploy que passa a interpretar
seus codigos de erro. Depois da publicacao, o smoke em producao sera somente de
leitura e navegacao; os testes mutaveis permanecerao locais. O relatorio final
registrara migrations, commit, CI, deploy e riscos residuais.
