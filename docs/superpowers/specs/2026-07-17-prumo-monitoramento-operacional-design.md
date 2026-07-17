# Prumo - Monitoramento operacional v1

Data: 2026-07-17
Status: desenho aprovado para especificacao

## 1. Contexto

O Prumo ja possui uma base reativa de observabilidade:

- logs estruturados server-side com contexto sanitizado;
- error boundaries que emitem eventos internos;
- alertas operacionais por email via Resend;
- alertas imediatos nos caminhos criticos do webhook Asaas;
- persistencia idempotente de eventos em `billing_webhook_events`;
- correlacao por identificador de ocorrencia nos eventos de produto.

O estado de producao observado em 2026-07-17 estava saudavel:

- 39 eventos de webhook registrados;
- zero eventos pendentes ou com erro;
- zero checkouts SaaS parados ha mais de uma hora;
- SINAPI 2026-06 publicado, com 45.990 registros e 46 dias de idade.

A lacuna real nao e registrar mais logs. Falta uma supervisao ativa que detecte
silencio, divergencia e envelhecimento mesmo quando nenhuma requisicao falha na
frente do usuario.

## 2. Objetivos

1. Detectar falhas operacionais antes que um cliente precise reclama-las.
2. Alertar `arthurgodinho155@gmail.com` com contexto suficiente e sem PII.
3. Supervisionar webhook, checkout SaaS, cobrancas, assinaturas e SINAPI.
4. Conciliar estados suspeitos com o Asaas por consultas somente leitura.
5. Registrar execucoes e incidentes para auditoria e deduplicacao.
6. Manter o sistema simples e compativel com o plano Hobby da Vercel.

## 3. Fora de escopo

- corrigir automaticamente pagamento, cobranca, assinatura ou plano;
- reenviar ou forjar webhook do Asaas;
- criar cobranca, link, boleto, Pix ou assinatura durante monitoramento;
- adicionar Sentry, Better Stack, Slack ou outro fornecedor;
- criar painel administrativo visual nesta versao;
- armazenar payload bruto, documento, chave Pix, token ou dado pessoal;
- executar importacao SINAPI automaticamente;
- substituir logs da Vercel ou alertas reativos existentes.

## 4. Decisao de arquitetura

Sera usado um monitor hibrido:

- alertas reativos atuais permanecem imediatos;
- uma Vercel Cron Function executa uma varredura diaria;
- o Supabase guarda somente o resultado sanitizado da execucao e o ciclo de
  vida dos incidentes;
- o Asaas e consultado apenas para registros locais suspeitos;
- o Resend envia um resumo consolidado quando houver incidente novo,
  recorrente ou resolvido.

O Vercel Cron foi escolhido porque ja pertence ao stack do produto, funciona em
todos os planos e nao exige distribuir logica entre `pg_cron`, Vault, `pg_net`
e Edge Functions. No Hobby, a frequencia sera diaria. Aumentar a frequencia no
futuro nao exigira mudar o dominio do monitor.

Referencias:

- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://supabase.com/docs/guides/cron
- https://docs.asaas.com/reference/list-subscriptions

## 5. Componentes

### 5.1 Nucleo de verificacao

Modulo puro, sem Supabase, fetch ou Resend. Recebe snapshots tipados e produz:

- estado de cada verificacao: `healthy`, `warning` ou `critical`;
- fingerprint estavel do incidente;
- mensagem operacional curta;
- contexto permitido e sanitizado;
- severidade e criterio de resolucao.

Esse limite permite testar todas as regras sem rede e sem dados reais.

### 5.2 Repositorio operacional

Adaptador server-only responsavel por:

- iniciar e concluir uma execucao;
- buscar agregados locais sem PII;
- abrir, atualizar e resolver incidentes;
- decidir se um alerta pode ser reenviado;
- persistir apenas contexto aprovado.

Nenhum Client Component importara esse modulo.

### 5.3 Cliente de reconciliacao Asaas

O cliente atual recebera operacoes GET tipadas para:

- testar autenticacao e disponibilidade com listagem limitada;
- recuperar uma cobranca pelo `asaas_payment_id`;
- recuperar uma assinatura pelo `saas_asaas_subscription_id`.

As chamadas nao enviarao body, nao farao mutacao e terao timeout explicito.
Listagens completas serao proibidas no monitor.

### 5.4 Executor do monitor

Orquestra as verificacoes, limita concorrencia, agrega incidentes e envia no
maximo um resumo por severidade em cada execucao. Ele podera ser chamado pela
rota cron e diretamente em testes.

### 5.5 Rota cron

`GET /api/cron/operational-health`

- runtime Node.js;
- sempre dinamica e sem cache;
- aceita somente `Authorization: Bearer <CRON_SECRET>`;
- usa comparacao resistente a timing;
- retorna 401 sem consultar banco quando o segredo estiver incorreto;
- retorna 200 quando o monitor executou, mesmo que tenha encontrado incidentes;
- retorna 500 apenas quando o proprio monitor nao conseguiu concluir;
- nunca retorna detalhes de incidente, IDs ou erros internos na resposta.

### 5.6 Agendamento

O `vercel.json` registrara:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/operational-health",
      "schedule": "15 11 * * *"
    }
  ]
}
```

O horario e UTC. No Hobby, a execucao pode ocorrer em qualquer minuto entre
11:00 e 11:59 UTC, aproximadamente entre 08:00 e 08:59 em Brasilia.

## 6. Modelo de dados

### 6.1 `operational_monitor_runs`

Historico imutavel e sanitizado de cada execucao:

- `id uuid primary key`;
- `trigger text`: `cron` ou `manual`;
- `status text`: `running`, `healthy`, `warning`, `critical` ou `failed`;
- `started_at timestamptz`;
- `finished_at timestamptz null`;
- `check_counts jsonb` com apenas contagens por estado;
- `incident_count integer`;
- `alert_count integer`;
- `error_code text null`, usando codigo interno estavel;
- `created_at timestamptz`.

O registro nao armazenara resposta do Asaas, stack trace ou mensagem livre de
fornecedor.

### 6.2 `operational_incidents`

Estado atual de cada problema detectado:

- `fingerprint text primary key`;
- `check_name text`;
- `severity text`: `warning` ou `critical`;
- `status text`: `open` ou `resolved`;
- `summary text` limitado e controlado pelo codigo;
- `safe_context jsonb`;
- `first_seen_at timestamptz`;
- `last_seen_at timestamptz`;
- `last_notified_at timestamptz null`;
- `resolved_at timestamptz null`;
- `occurrence_count integer`;
- `created_at timestamptz`;
- `updated_at timestamptz`.

As duas tabelas terao RLS habilitada, sem policies para `anon` ou
`authenticated`, e acesso apenas por `service_role`. Constraints validarao
status, severidade, contagens, tamanho e formato basico do contexto.

## 7. Verificacoes e limites

### 7.1 Webhook Asaas

- evento com `processed_at is null` por mais de 10 minutos: `critical`;
- evento com `processing_error is not null`: `critical` imediatamente na
  varredura;
- o incidente agrupa por tipo de falha, sem incluir payload bruto;
- os alertas reativos atuais permanecem inalterados.

### 7.2 Checkout de assinatura

- `saas_pending_checkout_started_at` acima de 1 hora: `warning`;
- acima de 24 horas: `critical`;
- o contexto informa somente quantidade, faixa de idade e IDs tecnicos
  estritamente necessarios.

### 7.3 Disponibilidade e credencial Asaas

Uma listagem `GET /subscriptions?limit=1` sem body validara conectividade e
autenticacao:

- 401 ou 403: `critical` por chave, ambiente ou permissao incorretos;
- timeout, erro de rede ou 5xx: `warning`;
- resposta valida, mesmo vazia: `healthy`.

O erro sera classificado por codigo interno. Corpo da resposta nao sera salvo.

### 7.4 Cobrancas de obra

O monitor selecionara no maximo 25 cobrancas Asaas suspeitas por execucao:

- possuem `asaas_payment_id`;
- usam `payment_provider = 'asaas'`;
- estao em estado local nao terminal ou possuem vencimento relevante;
- registros mais antigos e mais proximos do vencimento tem prioridade.

Cada cobranca sera recuperada individualmente no Asaas:

- Asaas pago/confirmado e Prumo nao pago: `critical`;
- Prumo pago e Asaas em estado incompativel: `warning`;
- recurso remoto inexistente: `critical`;
- igualdade de estado: `healthy`.

O monitor apenas alerta. A correcao continua sendo investigacao manual ou
reprocessamento controlado do webhook.

### 7.5 Assinaturas SaaS

Somente empresas com `saas_asaas_subscription_id` entram na reconciliacao.
Empresas com acesso parceiro/manual sem assinatura Asaas nao geram alerta.

- plano Pro/Ultimate local com assinatura remota `INACTIVE` ou `EXPIRED`:
  `critical`;
- plano Gratis local com assinatura remota `ACTIVE`: `critical`;
- assinatura remota inexistente: `critical`;
- estados coerentes: `healthy`.

A consulta sera individual e limitada. O monitor nao ativa, rebaixa, cancela
ou recria plano.

### 7.6 Competencia SINAPI

A idade usa a competencia publicada mais recente, nao a data de upload:

- ate 60 dias: `healthy`;
- de 61 a 75 dias: `warning`;
- acima de 75 dias ou nenhuma release publicada: `critical`.

O contexto permite competencia, revisao, idade em dias e contagem de registros.

## 8. Ciclo de vida de incidente

1. Uma verificacao doente cria ou reabre incidente pelo fingerprint.
2. Repeticoes atualizam `last_seen_at` e `occurrence_count`.
3. Incidente novo entra no resumo da execucao.
4. Incidente aberto so e reenviado depois de 24 horas.
5. Verificacao saudavel resolve o incidente aberto correspondente.
6. Resolucao de incidente critico previamente notificado gera um unico email
   de recuperacao.
7. Resolucao de aviso e apenas registrada para evitar ruido.

O fingerprint nao contera PII. Exemplos:

- `asaas:webhook:unprocessed`;
- `asaas:auth:invalid`;
- `asaas:payment:remote-paid-local-pending:<charge_uuid>`;
- `saas:subscription:remote-inactive-local-paid:<company_uuid>`;
- `sinapi:stale`.

## 9. Envio e deduplicacao

`ALERT_EMAIL_TO` sera configurado em Production como
`arthurgodinho155@gmail.com`.

O executor agrupara incidentes para evitar tempestade de emails:

- no maximo um email critico por execucao;
- no maximo um email de avisos por execucao;
- no maximo um email de recuperacao por execucao.

A chave de idempotencia do Resend incluira tipo do resumo e dia UTC. O campo
`last_notified_at` sera atualizado somente depois de confirmacao do Resend. Se
o envio falhar, o incidente permanece notificavel e a falha aparece no run e
no log estruturado.

## 10. Tratamento de falhas

- Falha em uma consulta Asaas nao interrompe as verificacoes locais.
- Falha em uma verificacao vira resultado tipado e nao exception livre.
- Falha de banco ao abrir/concluir run retorna 500 e gera log estruturado.
- Se o banco estiver indisponivel, o handler tenta emitir alerta generico por
  Resend sem incluir detalhes do erro.
- Se banco e Resend falharem juntos, a Vercel ainda registra status 500 e log.
- Um timeout global encerra o monitor antes do limite da Function.
- O processamento de registros suspeitos tem limite e concorrencia pequena.
- Nenhum erro causa mutacao no Asaas ou nos estados financeiros locais.

## 11. Seguranca e privacidade

Nunca entram em run, incidente, email ou log do monitor:

- CPF ou CNPJ;
- nome, email ou telefone de cliente;
- chave Pix ou dados bancarios;
- payload bruto de webhook;
- token de orcamento ou link publico;
- API key, service role, webhook token ou `CRON_SECRET`;
- URL de checkout ou fatura completa;
- stack trace de fornecedor.

IDs internos de empresa, cobranca, assinatura e evento podem aparecer quando
necessarios para localizar o registro, mas nunca acompanhados de PII.

O `CRON_SECRET` sera aleatorio, com pelo menos 32 bytes, Production-only. A
rota nao confiara somente no user-agent da Vercel.

## 12. Testes

### 12.1 Unidade

- classificacao de todos os limites;
- normalizacao dos estados Asaas;
- selecao e limite de registros suspeitos;
- fingerprint sem PII;
- abertura, repeticao, reenvio e resolucao;
- contexto e email escapados;
- deduplicacao diaria;
- falha de envio preserva notificabilidade.

### 12.2 Rota

- sem header, segredo vazio e segredo incorreto retornam 401;
- segredo correto chama o executor;
- incidentes encontrados retornam 200;
- falha estrutural retorna 500 sem detalhes;
- resposta nao expoe IDs ou contexto.

### 12.3 Integracao local

- migrations aplicam em banco limpo;
- RLS bloqueia `anon` e `authenticated`;
- service role cria e resolve runs/incidentes;
- fixtures de webhook travado, checkout antigo e SINAPI vencido;
- adapters Asaas e Resend mockados, sem trafego real no CI.

### 12.4 Gates

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run test:e2e`;
- `npm run build`;
- `npx supabase db reset --local --workdir .. --no-seed`;
- `npx supabase db lint --local --workdir .. --level warning`.

## 13. Rollout de producao

1. Aplicar migration das tabelas operacionais.
2. Configurar `ALERT_EMAIL_TO` e `CRON_SECRET` em Production.
3. Fazer deploy com rota e `vercel.json`.
4. Confirmar que o job aparece no painel Cron Jobs da Vercel.
5. Executar manualmente a rota com autorizacao, em modo normal somente leitura.
6. Enviar um alerta de teste controlado pelo utilitario operacional local.
7. Confirmar recebimento em `arthurgodinho155@gmail.com`.
8. Verificar run `healthy` em producao e ausencia de PII nos logs.
9. Registrar evidencia e remover qualquer fixture de teste.

O deploy nao criara cobranca e nao alterara plano. Se for necessario reverter,
remove-se o cron de `vercel.json` e publica-se novamente. As tabelas podem
permanecer sem risco, pois sao privadas e aditivas.

## 14. Criterios de aceite

- existe uma execucao registrada a cada janela diaria esperada;
- webhook travado acima de 10 minutos abre incidente critico;
- divergencia remota nao altera dados e gera alerta sanitizado;
- incidentes iguais nao geram mais de um resumo por 24 horas;
- incidente critico resolvido gera um unico email de recuperacao;
- SINAPI acima de 60 dias gera aviso e acima de 75 gera critico;
- rota rejeita qualquer chamada sem `CRON_SECRET` valido;
- nenhuma informacao proibida aparece em banco, email, resposta ou log;
- email de teste chega ao destino operacional;
- todos os gates locais e CI permanecem verdes.

## 15. Evolucao futura

Quando volume ou receita justificarem:

- aumentar o cron para horario em plano Vercel compativel;
- adicionar painel interno de incidentes;
- criar reconciliacao manual assistida com confirmacao humana;
- integrar Sentry/OpenTelemetry para stack e tracing;
- adicionar canal secundario de alerta;
- automatizar preparacao mensal da nova competencia SINAPI, mantendo
  publicacao sob validacao humana.
