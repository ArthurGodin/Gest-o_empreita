# Prumo SINAPI Profissional V1 - Plano de implementacao

**Spec:** [2026-07-17-prumo-sinapi-profissional-v1-design.md](../specs/2026-07-17-prumo-sinapi-profissional-v1-design.md)

## Objetivo

Entregar uma consulta SINAPI versionada, auditavel e exclusiva do Ultimate,
integrada ao catalogo e ao editor de orcamento sem alterar silenciosamente
precos antigos, depender da CAIXA em tempo real ou tocar no fluxo Asaas.

O rollout e protegido por feature flag. Codigo, migrations e dados podem chegar
a producao antes de o recurso aparecer para clientes. Landing, Precos e textos
comerciais so mudam no ultimo gate.

## Lote 1 - Fonte real e dominio puro

### Tarefa 1 - Inspecionar o pacote oficial

- Baixar um pacote ZIP/XLSX atual diretamente da pagina oficial da CAIXA.
- Guardar o arquivo somente em `web/.sinapi/sources/`, ignorado pelo Git.
- Registrar nome, URL, SHA-256, competencia, planilhas e cabecalhos encontrados.
- Conferir amostras de insumos, composicoes, UFs, regimes, unidades, valores
  ausentes e origens de preco.
- Comparar pelo menos cinco linhas de cada tipo com a consulta/PDF oficial.
- Nao escrever parser baseado em nome presumido de aba.
- Criar um manifest de layout explicito depois da inspecao real.

Arquivos previstos:

- `.gitignore`
- `web/scripts/sinapi/layouts/caixa-2025.ts`
- `web/scripts/sinapi/README.md`
- arquivos oficiais apenas em `web/.sinapi/`, nunca no commit.

Verificacao:

- hash reproduzivel com SHA-256;
- nenhuma credencial ou arquivo oficial em `git status`;
- manifest cobre todos os cabecalhos efetivamente usados.

### Tarefa 2 - Tipos, UFs e dinheiro

- Criar tipos de competencia, tipo de referencia, regime, entrada normalizada,
  mapa de precos e relatorio de validacao.
- Centralizar as 27 UFs brasileiras e validacao case-insensitive.
- Normalizar competencia para o primeiro dia do mes.
- Converter valores monetarios decimais para centavos sem `float` acumulado.
- Normalizar codigo como texto para preservar zeros e sufixos.
- Produzir `search_text` em minusculas e sem diacriticos.
- Implementar acrescimo com basis points e arredondamento explicito.
- Cobrir entradas validas, vazias, negativas, mal formatadas e limites.

Arquivos previstos:

- `web/src/lib/brazil-states.ts`
- `web/src/lib/brazil-states.test.ts`
- `web/src/lib/sinapi/domain.ts`
- `web/src/lib/sinapi/domain.test.ts`
- `web/src/app/onboarding/actions.ts`
- `web/src/app/app/configuracoes/company-draft.ts`
- testes existentes de onboarding/configuracoes quando necessario.

Verificacao:

- `npm test -- brazil-states sinapi/domain company-draft`
- `npm run typecheck`

Checkpoint de commit:

`feat: define Prumo SINAPI domain`

## Lote 2 - Banco isolado e imutavel

### Tarefa 3 - Publicacoes, entradas e storage privado

- Habilitar `pg_trgm` no schema de extensoes adotado pelo Supabase.
- Criar enums SINAPI.
- Criar `sinapi_releases` com competencia, revisao, status, fonte, storage,
  SHA-256, contagens e resumo.
- Criar `sinapi_entries` com referencia, regime, mapa JSONB por UF e texto de
  busca normalizado.
- Criar constraints de competencia, hash, contagens, unicidade e campos vazios.
- Criar indice de codigo e GIN trigram.
- Criar bucket privado `sinapi-sources` sem leitura anon/authenticated.
- Habilitar RLS sem policies diretas para clientes.
- Bloquear update/delete quando a release estiver `published` ou `superseded`.
- Permitir cascade somente para `staging` e `rejected`.
- Criar publicacao transacional com advisory lock por competencia.
- Revogar funcoes administrativas de `public`, `anon` e `authenticated`.
- Conceder somente ao `service_role` o necessario para importar e publicar.

Arquivo previsto:

- `supabase/migrations/20260717000001_sinapi_foundation.sql`

Verificacao:

- `npx supabase db reset --local --workdir ..`
- consultas de catalogo do Postgres para tabelas, enums, indices e grants;
- teste de update/delete em staging versus published;
- teste de duas publicacoes concorrentes da mesma competencia;
- `npx supabase db lint --local --workdir ..` quando disponivel.

### Tarefa 4 - Busca e entitlement no banco

- Criar RPC de listagem de competencias publicadas.
- Criar RPC de busca com empresa, query, UF, competencia, tipo, regime, limite e
  offset/cursor.
- Validar `auth.uid()`, membership e `companies.plan = ultimate`.
- Rejeitar query curta, UF invalida, limite excessivo e release inexistente.
- Selecionar apenas a revisao publicada da competencia.
- Extrair preco da UF sem transformar chave ausente em zero.
- Ordenar por codigo exato, prefixo, inicio de descricao e similaridade.
- Retornar no maximo 20 linhas e somente campos necessarios.
- Criar erro de dominio identificavel para plano sem acesso.

Arquivo previsto:

- `supabase/migrations/20260717000002_sinapi_search.sql`

Verificacao:

- anon bloqueado;
- Free bloqueado;
- Pro bloqueado;
- Ultimate membro autorizado;
- Ultimate de outra empresa nao autoriza o chamador;
- codigo exato vence descricao aproximada;
- referencia sem preco na UF nao retorna;
- `EXPLAIN (ANALYZE, BUFFERS)` com volume representativo.

### Tarefa 5 - Snapshots protegidos

- Adicionar campos opcionais `reference_*` e `sinapi_entry_id` a
  `catalog_items` e `quote_items`.
- Adicionar checks para conjunto completo ou conjunto totalmente nulo.
- Criar funcao compartilhada que resolve dados oficiais pelo ID e UF.
- Conferir Ultimate e preco existente antes de aceitar selo SINAPI.
- Sobrescrever codigo, tipo, competencia, revisao, regime, descricao oficial,
  unidade oficial, custo e hash a partir do banco.
- Aceitar do usuario apenas acrescimo e preco final.
- Atualizar `replace_quote_items` para resolver os snapshots na mesma transacao.
- Preservar o comportamento de itens comuns.
- Garantir que direct insert nao consiga criar selo oficial falso.
- Atualizar grants da assinatura final da RPC atomica.

Arquivo previsto:

- `supabase/migrations/20260717000003_sinapi_snapshots.sql`

Verificacao:

- payload oficial falsificado e sobrescrito/rejeitado;
- snapshot comum continua nulo;
- snapshot SINAPI persiste depois de superseder a release;
- Free/Pro nao inserem snapshot;
- replace atomico continua aceitando zero itens;
- rollback total quando uma entrada SINAPI e invalida.

Checkpoint de commit:

`feat: add immutable Prumo SINAPI storage`

## Lote 3 - Importador administrativo

### Tarefa 6 - Dependencias e adaptador ZIP/XLSX

- Adicionar apenas dependencias administrativas auditadas para XLSX, ZIP e
  execucao TypeScript do CLI.
- Manter essas dependencias fora do bundle de runtime do Next.js.
- Ler ZIP e XLSX com APIs estruturadas, sem parse de XML ou CSV improvisado.
- Detectar manifest suportado por cabecalhos e nao por posicao fixa de arquivo.
- Rejeitar layout desconhecido com lista de cabecalhos observados.
- Gerar fixture XLSX minima durante teste em diretorio temporario.

Arquivos previstos:

- `web/package.json`
- `web/package-lock.json`
- `web/scripts/sinapi/package-reader.ts`
- `web/scripts/sinapi/package-reader.test.ts`
- `web/scripts/sinapi/layouts/caixa-2025.ts`

Verificacao:

- `npm audit --audit-level=moderate`
- teste de ZIP, XLSX direto, arquivo corrompido e layout desconhecido;
- `npm run build` sem importar o parser para chunks do aplicativo.

### Tarefa 7 - Parser e validacao

- Converter linhas oficiais para o dominio normalizado.
- Agregar os 27 precos por entrada, tipo, codigo e regime.
- Manter ausencia de chave para preco nao publicado.
- Detectar codigo duplicado, unidade vazia, UF desconhecida, negativo, decimal
  invalido e competencia divergente.
- Calcular contagens por tipo, regime e UF.
- Comparar contagem com release anterior e gerar avisos para variacao anormal.
- Gerar amostra das maiores variacoes de preco sem bloquear automaticamente.
- Classificar erros bloqueantes e avisos.
- Nao persistir quando houver erro bloqueante.

Arquivos previstos:

- `web/scripts/sinapi/parse-release.ts`
- `web/scripts/sinapi/validate-release.ts`
- `web/scripts/sinapi/report.ts`
- `web/scripts/sinapi/importer.test.ts`
- fixtures minimas em `web/scripts/sinapi/fixtures/` somente quando nao forem
  arquivos oficiais completos.

Verificacao:

- testes de todos os erros bloqueantes;
- comparacao de amostras contra o pacote real;
- relatorio deterministico para o mesmo arquivo.

### Tarefa 8 - CLI dry run, importacao e publicacao

- Criar comandos `inspect`, `dry-run`, `import` e `publish`.
- Fazer `dry-run` ser o comportamento padrao.
- Exigir arquivo, URL oficial e competencia.
- Calcular hash antes de extrair.
- Arquivar fonte no bucket privado com caminho deterministico.
- Criar release staging e inserir entradas em lotes idempotentes.
- Comparar contagens locais e remotas antes de publicar.
- Publicar apenas por comando explicito.
- Reusar ou limpar staging do mesmo hash sem duplicar release.
- Sanitizar logs e nunca imprimir service role.
- Sair com codigo diferente de zero em erro.
- Documentar rollback e retificacao.

Arquivos previstos:

- `web/scripts/sinapi/cli.ts`
- `web/scripts/sinapi/database.ts`
- `web/scripts/sinapi/README.md`
- `web/package.json` para scripts `sinapi:*`.

Verificacao:

- dry run sem qualquer escrita;
- import interrompido nao publica;
- reexecucao do mesmo hash e idempotente;
- retificacao cria revisao e supersede a anterior;
- arquivo privado existe e o hash remoto confere;
- `git status` nao inclui arquivo fonte nem relatorio local.

Checkpoint de commit:

`feat: import validated Prumo SINAPI releases`

## Lote 4 - Aplicacao server-side

### Tarefa 9 - Feature flag e entitlement central

- Adicionar `PRUMO_SINAPI_ENABLED` server-only, false por padrao.
- Criar helper testavel sem expor a flag no bundle cliente.
- Adicionar entitlement `canUseSinapi` centralizado em `plans.ts`.
- Nao alterar features comerciais exibidas enquanto a flag estiver desligada.
- Adicionar eventos SINAPI permitidos sem texto pesquisado.
- Configurar E2E local explicitamente com a flag quando os testes precisarem.

Arquivos previstos:

- `web/src/lib/env-server-core.ts`
- `web/src/lib/env-server-core.test.ts`
- `web/src/lib/env-server.ts`
- `web/src/lib/plans.ts`
- `web/src/lib/plans.test.ts`
- `web/src/lib/product-event-names.ts`
- `web/scripts/run-e2e.mjs`
- `.env.example` ou `web/PRODUCAO.md` se ja houver contrato equivalente.

### Tarefa 10 - Repositorio, actions e contratos

- Criar repositorio server-only para releases e pesquisa.
- Mapear erros Postgres para `feature_disabled`, `plan_required`,
  `company_state_required`, `release_unavailable` e `unexpected`.
- Criar actions autenticadas para listar e pesquisar.
- Validar todos os argumentos com Zod.
- Limitar resposta e remover detalhes internos de erro.
- Registrar apenas tipo, UF, competencia, regime e contagem.
- Criar action para salvar referencia no catalogo usando resolucao server-side.
- Revalidar catalogo depois do sucesso.

Arquivos previstos:

- `web/src/lib/sinapi/types.ts`
- `web/src/lib/queries/sinapi.ts`
- `web/src/app/app/catalogo/sinapi-actions.ts`
- `web/src/app/app/catalogo/sinapi-actions.test.ts`
- `web/src/lib/supabase/types.ts`

Verificacao:

- testes de mapeamento dos cinco estados de dominio;
- nenhum erro SQL, hash ou ID interno em mensagem de cliente;
- typecheck e testes de planos/env/actions.

Checkpoint de commit:

`feat: expose protected Prumo SINAPI search`

## Lote 5 - Catalogo mobile-first

### Tarefa 11 - Estrutura de navegacao interna

- Adicionar controle segmentado `Meu catalogo` e `Referencias SINAPI` na pagina
  do catalogo, preservando filtros e importacao atuais.
- Usar query param estavel para a aba e manter links compartilhados.
- Nao adicionar item na sidebar ou bottom navigation.
- Mostrar aba SINAPI apenas com feature flag ligada.
- Para Free/Pro, mostrar chamada compacta e link para Planos.
- Para empresa sem UF, mostrar seletor e opcao de salvar nas configuracoes.
- Validar UF pela lista central.

Arquivos previstos:

- `web/src/app/app/catalogo/page.tsx`
- `web/src/app/app/catalogo/catalog-source-tabs.tsx`
- `web/src/app/app/catalogo/sinapi-upgrade-callout.tsx`
- `web/src/app/app/configuracoes/company-draft.ts`
- `web/src/app/app/configuracoes/company-form.tsx` se o seletor central exigir.

### Tarefa 12 - Busca e selecao

- Criar busca controlada com debounce, cancelamento logico e stale response
  protection.
- Mostrar tipo, UF e competencia no resumo de filtros.
- Abrir filtros secundarios em dialog/folha compacta no mobile.
- Renderizar resultados como linhas densas, sem tabela larga ou cards aninhados.
- Implementar teclado, foco, loading, vazio, indisponivel e erro.
- Abrir painel de referencia responsivo.
- Mostrar fonte, custo, UF, competencia, revisao e regime.
- Implementar acrescimo e preco final com helpers puros.
- Salvar no catalogo e refletir sucesso sem duplicar item.
- Avisar que o custo e referencia e exige conferencia local.

Arquivos previstos:

- `web/src/app/app/catalogo/sinapi-browser.tsx`
- `web/src/app/app/catalogo/sinapi-filters.tsx`
- `web/src/app/app/catalogo/sinapi-results.tsx`
- `web/src/app/app/catalogo/sinapi-reference-dialog.tsx`
- `web/src/app/app/catalogo/sinapi-price-draft.ts`
- `web/src/app/app/catalogo/sinapi-price-draft.test.ts`

Verificacao:

- teclado e leitor de tela;
- sem request para menos de dois caracteres;
- resposta antiga nao substitui busca nova;
- 375, 390, 768 e 1440 sem overflow/zoom;
- catalogo manual e importacao CSV sem regressao.

Checkpoint de commit:

`feat: browse Prumo SINAPI references`

## Lote 6 - Editor de orcamento e snapshots

### Tarefa 13 - Modelo de rascunho SINAPI

- Estender `ItemDraft` apenas com identificador SINAPI, UF e acrescimo que o
  servidor precisa resolver.
- Normalizar e assinar esses campos no dirty state.
- Validar conjunto completo ou ausente.
- Preservar linhas comuns e itens antigos.
- Adicionar helper que transforma selecao em nova linha do editor.
- Cobrir ajuste, edicao de descricao/unidade, reorder, remove, undo e save.

Arquivos previstos:

- `web/src/app/app/orcamentos/[id]/quote-draft.ts`
- `web/src/app/app/orcamentos/[id]/quote-draft.test.ts`
- `web/src/app/app/orcamentos/actions/update.ts`

### Tarefa 14 - Seletor reutilizavel no editor

- Adicionar `Buscar no SINAPI` proximo de `Adicionar item`.
- Reusar o browser/painel por uma API de selecao sem duplicar regras de busca.
- Inserir nova linha com preco final e metadados minimos.
- Mostrar badge compacto e acao de detalhes da fonte.
- Manter autocomplete atual restrito ao catalogo proprio.
- Preservar barra de salvamento, protecao de saida e foco.
- Desabilitar seletor em orcamento imutavel ou durante salvamento.

Arquivos previstos:

- `web/src/app/app/orcamentos/[id]/quote-items-section.tsx`
- `web/src/app/app/orcamentos/[id]/item-row.tsx`
- `web/src/app/app/orcamentos/[id]/sinapi-picker.tsx`
- `web/src/app/app/orcamentos/[id]/sinapi-source-details.tsx`
- componentes SINAPI compartilhados extraidos para
  `web/src/components/sinapi/` quando houver uso real em dois fluxos.

### Tarefa 15 - Copias, diagnostico, link e PDF

- Atualizar duplicacao/revisao para copiar todos os campos `reference_*`.
- Garantir que release superseded continue resolvida sem mudar custo.
- Atualizar kit de diagnostico para criar apenas item comum, sem fonte falsa.
- Confirmar que queries com `quote_items(*)` continuam tipadas.
- Manter link publico e PDF usando descricao e preco final existentes.
- Exibir fonte no PDF somente se um desenho separado for aprovado; nao inserir
  texto automaticamente neste lote.
- Confirmar conversao em obra sem dependencia de campos SINAPI.

Arquivos previstos:

- `web/src/app/app/orcamentos/actions/duplicate.ts`
- `web/src/app/app/configuracoes/diagnostico/actions.ts`
- `web/src/lib/queries/quotes.ts`
- `web/src/lib/pdf/generate.tsx` apenas se tipagem exigir, sem mudar layout.
- `web/src/app/q/[token]/page.tsx` apenas se tipagem exigir.

Verificacao:

- salvar, recarregar, duplicar e revisar preservam snapshot;
- nova competencia nao muda duplicata antiga;
- PDF e link publico continuam com mesmo total;
- core flow de aprovacao/conversao permanece verde.

Checkpoint de commit:

`feat: add Prumo SINAPI references to quotes`

## Lote 7 - Evidencia, dados reais e rollout

### Tarefa 16 - Testes E2E e desempenho

- Seed de release sintetica pequena para testes deterministas.
- Criar empresa Free, Pro e Ultimate isoladas.
- Cobrir bloqueio por plano no banco e na interface.
- Buscar, selecionar, aplicar acrescimo, salvar catalogo e salvar orcamento.
- Recarregar, duplicar e conferir snapshot.
- Cobrir empresa sem UF, release ausente, release antiga e preco ausente.
- Rodar desktop e mobile sem erro de console ou overflow.
- Criar carga representativa para medir a query com `EXPLAIN`.
- Nao usar API CAIXA nem Asaas durante E2E.

Arquivos previstos:

- `web/e2e/database/sinapi-security.spec.ts`
- `web/e2e/browser/sinapi-catalog.spec.ts`
- `web/e2e/browser/sinapi-quote.spec.ts`
- helpers E2E existentes, estendidos sem dados reais.

### Tarefa 17 - Importacao oficial controlada

- Rodar dry run com pacote real atual.
- Revisar relatorio e comparar amostras oficiais.
- Importar e publicar primeiro em Supabase local/staging.
- Executar busca e snapshots contra dados reais.
- Medir volume, storage e latencia.
- Corrigir parser/indices antes de producao.
- Importar em producao com feature flag desligada.
- Confirmar bucket privado e RPC bloqueada para planos nao elegiveis.
- Repetir com segunda competencia ou retificacao antes de comunicar o recurso.

### Tarefa 18 - Operacao e gate comercial

- Documentar passo a passo mensal, verificacao, publicacao, retificacao e
  rollback.
- Adicionar monitor de competencia com alerta depois de 60 dias.
- Configurar `PRUMO_SINAPI_ENABLED` somente depois do smoke autenticado.
- Atualizar plano Ultimate e Precos apenas depois do gate tecnico e operacional.
- Atualizar guia do Asafe com texto permitido e proibido.
- Rodar lint, typecheck, testes, audit, build e E2E completo.
- Fazer QA visual real desktop/mobile.
- Commitar, push, acompanhar CI/Vercel e executar smoke de producao.

Arquivos previstos:

- `docs/operacao-sinapi-prumo.md`
- `docs/guia-asafe-facebook-ads-prumo.md` somente no gate final.
- `web/src/lib/plans.ts` somente no gate final para texto comercial.
- `web/src/app/precos/page.tsx` e landing somente se consumirem o contrato
  central e depois da ativacao real.
- `web/PRODUCAO.md` para flag e operacao.

Checkpoint de commit:

`docs: validate Prumo SINAPI production rollout`

## Ordem de execucao

1. Inspecao oficial e dominio puro.
2. Banco foundation, busca e snapshots.
3. Importador com fixture e dry run real.
4. Feature flag, entitlement e repositorio server-only.
5. Catalogo SINAPI.
6. Editor de orcamento e caminhos de copia.
7. E2E, desempenho e QA visual.
8. Primeiro dado real com flag desligada.
9. Segunda operacao mensal ou retificacao.
10. Ativacao Ultimate e comunicacao comercial.

## Comandos de verificacao

No diretorio `web`:

```powershell
npm run lint
npm run typecheck
npm test
npm run audit:ci
npm run build
npm run test:e2e
```

No repositorio:

```powershell
npx supabase db reset --local
git diff --check
git status --short
```

Comandos SINAPI finais devem existir com estes nomes:

```powershell
npm run sinapi:inspect -- --file <pacote>
npm run sinapi:dry-run -- --file <pacote> --source-url <url> --competence YYYY-MM
npm run sinapi:import -- --file <pacote> --source-url <url> --competence YYYY-MM
npm run sinapi:publish -- --release-id <uuid>
```

## Checkpoints de commit

1. `feat: define Prumo SINAPI domain`
2. `feat: add immutable Prumo SINAPI storage`
3. `feat: import validated Prumo SINAPI releases`
4. `feat: expose protected Prumo SINAPI search`
5. `feat: browse Prumo SINAPI references`
6. `feat: add Prumo SINAPI references to quotes`
7. `test: cover Prumo SINAPI critical journeys`
8. `docs: validate Prumo SINAPI production rollout`

Cada checkpoint deve passar `git diff --check`, typecheck e os testes diretamente
relacionados. Migrations devem reconstruir um banco local vazio antes do commit.

## Invariantes

- Nenhuma chamada Asaas ou alteracao em webhook.
- Nenhuma cobranca ou plano ativado por teste SINAPI.
- Nenhuma fonte oficial no Git.
- Nenhuma service role em log, bundle, screenshot ou erro de cliente.
- Nenhum dado SINAPI acessivel por `anon`.
- Nenhum selo oficial criado apenas por payload do cliente.
- Nenhum preco antigo alterado por nova competencia.
- Nenhuma ausencia de preco convertida em zero.
- Nenhuma mudanca comercial antes de dados e operacao validados.
- Catalogo manual, CSV, PDF, link publico e aprovacao continuam funcionais.
- A feature flag permanece false por padrao.
- Alteracoes preexistentes do usuario permanecem fora dos commits SINAPI.

## Criterios de conclusao

1. Pacote oficial real e interpretado por layout observado, nao presumido.
2. Importacao invalida nunca publica dados parciais.
3. Retificacao preserva a revisao anterior.
4. Banco autoriza somente Ultimate membro da empresa.
5. Snapshot oficial nao pode ser falsificado pelo cliente.
6. Catalogo e editor usam a mesma fonte de busca e precificacao.
7. Orcamento antigo preserva custo, UF, competencia, regime e hash.
8. Mobile 375/390 e desktop nao apresentam overflow ou acao coberta.
9. Busca atende a meta de desempenho com volume representativo.
10. Suite atual e novos E2E ficam verdes.
11. Producao recebe dados com flag desligada antes da exposicao.
12. Ultimate so promete o recurso depois de duas operacoes validadas.
