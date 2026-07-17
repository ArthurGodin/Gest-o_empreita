# Prumo - Monitoramento operacional v1 - Plano de implementacao

**Spec:** [2026-07-17-prumo-monitoramento-operacional-design.md](../specs/2026-07-17-prumo-monitoramento-operacional-design.md)

## Objetivo

Entregar uma supervisao diaria, privada e somente leitura para os fluxos que
podem impedir uma venda ou esconder receita: webhook Asaas, checkout SaaS,
cobrancas de obra, assinaturas e atualizacao SINAPI.

O monitor deve detectar divergencias, registrar incidentes sanitizados, evitar
alertas duplicados e avisar `arthurgodinho155@gmail.com`, sem criar cobranca,
alterar plano, reprocessar webhook ou expor PII.

## Ordem de seguranca

1. Criar schema privado e aditivo.
2. Implementar regras puras com cobertura de limites.
3. Implementar persistencia e reconciliacao GET isoladas.
4. Expor rota autenticada e agendamento.
5. Validar tudo localmente com Asaas e Resend mockados.
6. Aplicar migration antes do deploy do codigo.
7. Configurar segredos, publicar e executar smoke somente leitura.

## Lote 1 - Banco privado e contratos

### Tarefa 1 - Persistencia de runs e incidentes

Criar `supabase/migrations/20260717000004_operational_monitoring.sql` com:

- `operational_monitor_runs`, incluindo `run_key` unico, trigger, status,
  horarios, contagens JSONB, totais e codigo de erro controlado;
- `operational_incidents`, incluindo fingerprint, check, severidade, status,
  contexto seguro e ciclo de vida;
- constraints para estados, contagens, comprimentos, JSON objeto e transicao
  `running` para estado final;
- indices para runs recentes, incidentes abertos e reenvio;
- RLS habilitada sem policy para `anon` ou `authenticated`;
- revogacao explicita de acesso publico e grants apenas para `service_role`;
- comentarios de seguranca documentando que payload e PII sao proibidos.

Verificacao:

- migration aplica em banco limpo e sobre banco atual;
- `anon` e `authenticated` nao leem nem escrevem;
- `service_role` inicia/conclui run e abre/resolve incidente;
- run concluido nao volta para `running`;
- contexto que nao seja objeto e rejeitado.

### Tarefa 2 - Atualizar tipos gerados e ambiente

- regenerar `web/src/lib/supabase/types.ts` depois da migration;
- preservar aliases manuais existentes no final do arquivo;
- adicionar `CRON_SECRET` ao schema e carregamento server-side;
- testar valor ausente, vazio e valido em `env-server-core.test.ts`;
- documentar `CRON_SECRET` e `ALERT_EMAIL_TO` nos exemplos e guia de producao
  ja adotados pelo repositorio, sem inserir valores reais.

Checkpoint de commit:

`feat: add private operational monitoring storage`

## Lote 2 - Dominio puro e ciclo de incidentes

### Tarefa 3 - Regras de saude operacionais

Criar `web/src/lib/operations/monitor-core.ts` sem imports server-only para:

- tipos `healthy`, `warning` e `critical`;
- avaliacao de webhook nao processado ou com erro;
- avaliacao de checkout acima de 1h e 24h;
- classificacao de autenticacao, timeout, rede, 5xx e 404 Asaas;
- normalizacao conservadora dos estados de cobranca Asaas;
- divergencia remota paga/local nao paga e local paga/remota incompativel;
- coerencia entre plano local e estado de assinatura remota;
- idade da competencia SINAPI em UTC;
- fingerprints estaveis sem valores livres ou PII;
- selecao priorizada e limite de 20 cobrancas e 20 assinaturas;
- incidentes de truncamento quando a cobertura for parcial.

Criar `web/src/lib/operations/monitor-core.test.ts` cobrindo todos os limites,
inclusive exatamente 10 minutos, 1h, 24h, 60 dias, 75 dias, estados remotos
desconhecidos e ordenacao deterministica.

### Tarefa 4 - Planejar transicoes e notificacoes

Criar `web/src/lib/operations/incident-lifecycle.ts` como modulo puro para:

- novo incidente, recorrencia, reabertura e resolucao;
- reenvio somente depois de 24h;
- recuperacao somente de critico previamente notificado;
- agrupamento em no maximo um resumo critico, um aviso e uma recuperacao;
- chave diaria de idempotencia por tipo de resumo;
- decisao que mantem notificabilidade quando o envio falha.

Cobrir em `incident-lifecycle.test.ts` mudancas de severidade, repeticao no
mesmo dia, virada UTC, falha de envio e resolucao sem alerta previo.

Checkpoint de commit:

`feat: define operational health rules`

## Lote 3 - Consultas locais e reconciliacao Asaas

### Tarefa 5 - Repositorio operacional

Criar `web/src/lib/operations/repository.ts`, server-only, para:

- tentar iniciar um run por `run_key` e reconhecer duplicata sem erro;
- concluir run com estado e contagens sanitizadas;
- buscar somente os campos necessarios de webhook, empresas, cobrancas e
  releases SINAPI;
- aplicar filtros no banco antes de carregar candidatos;
- abrir, atualizar, reabrir e resolver incidentes por fingerprint;
- marcar `last_notified_at` apenas depois do envio confirmado;
- nunca buscar `raw_payload`, CPF/CNPJ, email, telefone, Pix ou URLs.

Queries devem usar selecoes explicitas, limites e ordenacao. Falhas devem usar
codigos internos, sem persistir mensagem livre do fornecedor.

### Tarefa 6 - Cliente Asaas somente leitura

Estender o cliente de `web/src/lib/asaas/` com:

- suporte a `AbortSignal` ou timeout explicito no request compartilhado;
- tipos minimos para listagem de assinatura, cobranca e assinatura individual;
- `GET /subscriptions?limit=1` para health check;
- `GET /payments/{id}` e `GET /subscriptions/{id}`;
- nenhum metodo de monitoramento que aceite body ou verbo mutavel;
- classificacao segura de `401`, `403`, `404`, `5xx`, abort e rede;
- concorrencia maxima de quatro requisicoes e timeout de quatro segundos.

Testes devem mockar `fetch`, verificar URL/verbo/timeout e provar que nenhum
request de reconciliacao usa POST, PUT ou DELETE.

### Tarefa 7 - Montar snapshot sanitizado

Criar `web/src/lib/operations/snapshot.ts` para combinar:

- agregados locais;
- ate 20 cobrancas priorizadas;
- ate 20 assinaturas priorizadas;
- resultados remotos tipados;
- contagens totais e excedentes;
- erros por consulta convertidos em sinais operacionais.

O snapshot retornado nao pode conter dados pessoais, token, body de erro ou
URL de pagamento. Testes devem procurar chaves proibidas no objeto serializado.

Checkpoint de commit:

`feat: reconcile Prumo operational state`

## Lote 4 - Executor, alertas e rota cron

### Tarefa 8 - Alertas consolidados

- estender `AlertSeverity` com `resolved`;
- dar ao email de recuperacao assunto e cor proprios;
- criar formatacao de resumo com quantidade, checks e contexto tecnico minimo;
- escapar todo valor e limitar listas/comprimentos;
- usar `ALERT_EMAIL_TO` como destino e idempotency key por dia UTC;
- adicionar utilitario local de alerta controlado que nao rode no CI nem seja
  exposto como endpoint publico.

Atualizar testes de `alerts-core` para `critical`, `warning` e `resolved`.

### Tarefa 9 - Executor resiliente

Criar `web/src/lib/operations/monitor.ts` para:

- iniciar run idempotente;
- coletar snapshot e avaliar regras;
- persistir ciclo de incidentes;
- enviar resumos com no maximo tres emails;
- concluir run como `healthy`, `warning`, `critical` ou `failed`;
- impor orcamento global de 45 segundos;
- continuar checks locais quando Asaas falhar;
- emitir log estruturado sanitizado;
- tentar alerta generico quando o banco impedir a conclusao.

O executor recebe dependencias injetaveis nos testes. CI nunca usa credencial ou
trafego real.

### Tarefa 10 - Autenticacao e endpoint

Criar:

- `web/src/lib/operations/cron-auth-core.ts` com comparacao resistente a timing;
- testes para header ausente, malformado, segredo vazio, incorreto e correto;
- `web/src/app/api/cron/operational-health/route.ts` com runtime Node, dynamic
  force-dynamic e `no-store`;
- resposta publica limitada a `{ ok, status }`, sem IDs ou contexto;
- `run_key` diario para user-agent `vercel-cron/1.0` e UUID para manual;
- 401 antes de qualquer consulta, 200 para monitor concluido ou duplicado e
  500 sanitizado para falha estrutural.

Teste de rota deve injetar/mockar o executor e comprovar que segredo incorreto
nao toca banco.

### Tarefa 11 - Agendamento Vercel

Criar `web/vercel.json`:

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

Checkpoint de commit:

`feat: add secure operational health cron`

## Lote 5 - Validacao local

### Tarefa 12 - Gates focados

Executar durante cada lote:

- `npm test -- monitor-core incident-lifecycle alerts-core`;
- `npm run typecheck`;
- `npm run lint`.

Corrigir causa raiz de cada falha sem enfraquecer tipos ou testes.

### Tarefa 13 - Banco e seguranca

Executar com Supabase local:

- `npx supabase db reset --local --workdir .. --no-seed`;
- testes SQL de RLS/grants/transicoes;
- `npx supabase db lint --local --workdir .. --level warning`;
- gerar tipos a partir do banco local e conferir diff.

### Tarefa 14 - Suite completa

Executar:

- `npm run test`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- `npm run test:e2e` quando o ambiente local estiver disponivel;
- `git diff --check`;
- busca por segredo, CPF/CNPJ, payload e URLs em fixtures/artefatos.

Checkpoint de commit:

`test: validate operational monitoring`

## Lote 6 - Rollout de producao

### Tarefa 15 - Banco antes do codigo

- confirmar projeto Supabase alvo;
- aplicar somente migrations pendentes;
- verificar tabelas, constraints, RLS e grants;
- nao inserir fixture de incidente em producao.

### Tarefa 16 - Segredos e deploy

- gerar `CRON_SECRET` aleatorio com pelo menos 32 bytes sem imprimi-lo;
- configurar `CRON_SECRET` somente em Production;
- configurar `ALERT_EMAIL_TO=arthurgodinho155@gmail.com` em Production;
- publicar commits sem incluir `docs/CHECKLIST_LANCAMENTO.md`;
- confirmar deploy Ready e Cron Job registrado.

### Tarefa 17 - Smoke operacional

- invocar manualmente a rota com o segredo em variavel local protegida;
- confirmar HTTP 200 e resposta sanitizada;
- consultar run e incidentes apenas por contagens/campos permitidos;
- provar que nenhuma cobranca, assinatura, plano ou webhook foi alterado;
- disparar um unico alerta de teste identificado como teste;
- confirmar entrega para `arthurgodinho155@gmail.com`;
- registrar evidencia em `dogfood-output/operational-monitoring-2026-07-17/`.

### Tarefa 18 - Fechamento

- confirmar `git status` contendo apenas mudancas preexistentes do usuario;
- registrar URL de producao, commit e resultado dos gates;
- documentar risco residual do watchdog no proprio provedor;
- definir proximo passo por impacto real, sem adicionar painel antes de haver
  volume operacional que o justifique.

## Criterios de pronto

- uma janela UTC gera no maximo um run de cron;
- a rota sem segredo valido nao toca banco nem Asaas;
- divergencias financeiras sao somente lidas e alertadas;
- incidentes repetidos respeitam 24h e recuperacao critica ocorre uma vez;
- emails e banco nao contem PII, token, payload ou resposta bruta;
- nenhum fluxo existente de pagamento, plano ou webhook muda de comportamento;
- migrations, testes, lint, typecheck e build passam;
- cron aparece ativo na Vercel e um smoke real somente leitura conclui;
- o email operacional recebe o teste controlado.
