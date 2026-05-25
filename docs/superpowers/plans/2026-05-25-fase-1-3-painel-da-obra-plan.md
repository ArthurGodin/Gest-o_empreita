# Fase 1.3 — Plano de Implementação

**Spec:** [2026-05-25-fase-1-3-painel-da-obra-design.md](../specs/2026-05-25-fase-1-3-painel-da-obra-design.md)
**Estimativa total:** ~12-14 dias em 6 PRs incrementais
**Princípio:** cada PR ship independentemente. `main` sempre deployável. PR posterior pode ter "feature dependent" do anterior, mas nunca regressão visível pro usuário.

---

## PR 1 — Fundação: schema + storage + libs (~1.5 dia)

**Objetivo:** Todo o DB schema da fase aplicado, bucket criado, helpers prontos. Nenhuma rota nova ainda. `main` permanece deployável (placeholder de `/app/obras/[id]` continua válido).

### Migration `20260528000001_obra_panel.sql` (idempotente, padrão drop-then-create)

- [ ] Enum `stage_status ('todo','in_progress','done')`
- [ ] Enum `cost_category ('material','labor','freight','other')`
- [ ] Tabela `stage_templates` (+ index, RLS — SELECT permite `company_id is null` OR membership)
- [ ] Tabela `stage_template_items` (+ index, RLS via join, INSERT/UPDATE/DELETE só em templates não-system da própria empresa)
- [ ] Tabela `project_stages` (+ position index, unique (project_id,position), constraints de length, RLS tenant padrão)
- [ ] Tabela `diary_entries` (+ index, constraint body length, RLS tenant padrão)
- [ ] Tabela `diary_photos` (+ index, constraint size 1-5MB, RLS tenant padrão)
- [ ] Tabela `project_costs` (+ 2 indexes, constraint amount/description, RLS tenant padrão)
- [ ] Tabela `time_entries` (+ index, unique partial (project, worker, date) where ended_at not null, constraints, RLS tenant padrão)
- [ ] ALTER `projects` ADD COLUMN `template_id`, `progress_pct numeric(5,2)`, `last_diary_at timestamptz`
- [ ] Function/trigger `tg_recalc_project_progress` after insert/update/delete em `project_stages`
- [ ] Function/trigger `tg_touch_project_last_diary` after insert em `diary_entries`
- [ ] Trigger `tg_set_updated_at` em todas as novas tabelas que têm `updated_at`
- [ ] RPC `insert_diary_entry(uuid, uuid, text, jsonb) returns uuid` SECURITY DEFINER (valida membership + ownership + max 20 fotos + não vazio)
- [ ] RPC `instantiate_template_stages(uuid, uuid, uuid) returns int` SECURITY DEFINER (valida membership + acesso ao template)
- [ ] GRANT EXECUTE em ambas pra `authenticated`
- [ ] Seed: 3 templates de sistema (`is_system=true`, `company_id=null`):
  - Cobertura nova: 6 etapas (Remoção 1d, Reparo estrutural 2d, Manta 1d, Telha 4d, Calhas/rufos 3d, Limpeza 1d)
  - Reforma de cobertura: 5 etapas (Vistoria 1d, Substituição telhas 2d, Reparo calhas 2d, Pintura/imperm. 2d, Limpeza 1d)
  - Manutenção/Limpeza: 4 etapas (Vistoria 1d, Limpeza calhas 1d, Selante 1d, Entrega ½d → guardar como 1 com nota)
- [ ] Seed idempotente (ON CONFLICT DO NOTHING ou DELETE-then-INSERT atomicamente pra system templates só)
- [ ] Bucket `diary-photos` PRIVADO (`public=false`), sem policy authenticated/anon

### Código (`lib/`)

- [ ] `web/src/lib/supabase/types.ts` — regenerar ou estender com as 7 tabelas novas + 2 enums
- [ ] `web/src/lib/queries/projects.ts` — adicionar `getProjectWithRelations(id)` (paraleliza 6 queries: stages, diary+photos limit 5, costs all, time today, time history count, customer/company). Retorna `null` se não pertence ao tenant.
- [ ] `web/src/lib/queries/stage-templates.ts` — `listTemplates(companyId)` (system + custom), `getTemplate(id)` com items
- [ ] `web/src/lib/queries/diary.ts` — `listDiary(projectId, {limit, before?})` paginado por `created_at desc`, hidrata photos
- [ ] `web/src/lib/queries/costs.ts` — `listCosts(projectId)`, `getCostSummary(projectId)` → `{by_category: {...}, total_cents, margin_cents, margin_pct}`. Margem = `quote.total_cents - sum(costs)` (busca quote via `project_id` reverso)
- [ ] `web/src/lib/queries/time.ts` — `listTimeToday(projectId)`, `listTimeHistory(projectId, {limit})` ordenado por `worked_on desc, started_at desc`
- [ ] `web/src/lib/photos/resize.ts` — wrapper do `sharp`: `resizePhoto(buffer): Promise<{buffer, width, height, size_bytes}>` — maior lado 1200, JPEG q=82, stripa EXIF, `limitInputPixels: 24_000_000`, retorna `null` se input não-imagem
- [ ] `web/src/lib/supabase/storage.ts` — adicionar `uploadDiaryPhoto(companyId, projectId, buffer): Promise<{storage_path}>` (gera path `upload-<ts>-<rand6>/<uuid>.jpg`), `signedDiaryPhotoUrl(storage_path, ttlSec=3600)`, `deleteDiaryPhoto(storage_path)`
- [ ] `web/src/lib/project-status.ts` — `canTransitionStatus(from, to): boolean`, `suggestNextStatus(project, stages): Suggestion | null`
- [ ] `web/package.json` — adicionar `sharp` em dependencies (já no Vercel runtime, mas explicitar)

### Validação

- [ ] `pnpm tsc --noEmit` passa limpo
- [ ] `pnpm build` passa (12+ rotas, nada novo de UI)
- [ ] Migration aplica em DB limpo do Supabase Studio sem erro
- [ ] Re-run da migration sem erro (idempotência verificada com `\d+ project_stages` antes/depois)
- [ ] Smoke SQL: `select * from public.stage_templates where is_system=true;` retorna 3 rows
- [ ] Smoke SQL: tentar `insert into project_stages (...) values (...)` como usuário authenticated sem company_id correto → falha por RLS
- [ ] Smoke SQL: `select public.instantiate_template_stages(p1, c1, t1);` insere N etapas (N = items do template)

**Commit:** `feat(obras): foundation — schema + storage + libs (PR 1/6)`

---

## PR 2 — Etapas da obra (~2.5 dias)

**Objetivo:** Página `/app/obras/[id]` ganha sua primeira seção real: lista de etapas funcional com aplicar template, add/edit/reorder/marcar como done. `convertToProject` da Fase 1.2 ganha "qual template?" no submit. Resto do painel ainda placeholder.

### Server actions (`web/src/app/app/obras/[id]/actions.ts` — arquivo novo)

- [ ] `addStage(projectId, name, est_days?)` — zod + scope, calcula `position` como max+1
- [ ] `updateStage(stageId, patch)` — name, est_days, notes; valida ownership
- [ ] `setStageStatus(stageId, status)` — se `in_progress` e já houver outra `in_progress` na obra, rejeita com erro amigável OU auto-rebaixa anterior pra `todo` (decisão: rebaixa, simplifica UX). Se vira `done`, atualiza `completed_on=current_date`. Se vira `in_progress` e `started_on is null`, seta `started_on=current_date`.
- [ ] `reorderStages(projectId, orderedIds[])` — UPDATE single com CASE WHEN id=X THEN N pra evitar conflict no unique partial; valida que `orderedIds` é permutação do conjunto existente
- [ ] `deleteStage(stageId)` — só se status='todo' (segurança), valida ownership
- [ ] `applyTemplate(projectId, templateId)` — chama RPC `instantiate_template_stages`. Se já existe etapa, rejeita com mensagem ("já tem etapas — adicione manualmente ou apague todas primeiro")

### Conversão do orçamento — atualização da Fase 1.2

- [ ] `web/src/app/app/orcamentos/actions.ts` — `convertToProjectAction` ganha parâmetro opcional `templateId`
- [ ] Modal "Virar obra" no editor de quote aprovado: agora tem `<select>` de templates (system + custom da empresa). Default: "Cobertura nova". Opção "Sem template (criar etapas manualmente)".
- [ ] Após criar o project, se templateId, chama `instantiate_template_stages` na mesma action (transação implícita do PL/pgSQL via RPC)

### UI — painel `/app/obras/[id]`

- [ ] Renomear placeholder → estrutura nova com 5 seções (4 ainda placeholder neste PR, 1 real)
- [ ] `project-header.tsx` — title + endereço + pill status + data início. Menu de status simples (button "Mudar status" com dropdown — placeholder ação até PR 6)
- [ ] `stages-section.tsx` (server + client island) — busca via `getProjectWithRelations`
  - Header: barra de progresso (`progress_pct` direto do DB) + "X de Y concluídas" + "previsão término" (somatório de est_days a partir de starts_on)
  - Empty state: se 0 etapas, mostra cards com 3 templates de sistema + "Aplicar template" button cada
  - Lista de etapas: `stage-row.tsx` por linha
- [ ] `stage-row.tsx` (client) — checkbox + nome + sub (status/duração/datas) + pill. Click no checkbox alterna entre `todo`/`done` (rápido). Click no row expande inline pra editar (name, est_days, notes, delete). Drag-to-reorder com touch support (usar `@dnd-kit/sortable` ou solução simples com pointer events — decidir).
- [ ] `add-stage-form.tsx` (client) — input "+ Adicionar etapa" inline no fim da lista. Enter cria. Esc cancela.
- [ ] `apply-template-dialog.tsx` (client) — usado tanto em empty state quanto em menu "..."

### Testes (integration, real Postgres)

- [ ] RLS: usuário de company A não vê stages de company B (SELECT/UPDATE/DELETE)
- [ ] `setStageStatus` rebaixa anterior `in_progress` quando promove outra
- [ ] `instantiate_template_stages` rejeita template de outra company
- [ ] `instantiate_template_stages` popula positions 0..N-1 corretamente
- [ ] Trigger `tg_recalc_project_progress` muda `progress_pct` no insert/update/delete

### Smoke E2E (manual)

- [ ] Login → aprovar um quote → clicar "Virar obra" → escolher template "Cobertura nova" → 6 etapas criadas
- [ ] Marcar primeira etapa como done → progress vira 16.67%
- [ ] Adicionar etapa custom → aparece no fim
- [ ] Reorder etapas por drag → posições persistidas
- [ ] Apagar etapa em `todo` funciona; tentar apagar `in_progress` mostra erro amigável

**Commit:** `feat(obras): etapas com templates de obra (PR 2/6)`

---

## PR 3 — Diário de obra com fotos (~3 dias)

**Objetivo:** Encarregado posta entrada no diário com até 20 fotos pelo celular. Resize server-side. Lightbox. Funciona com 4G ruim (optimistic + retry).

### API route — upload de foto

- [ ] `web/src/app/api/diary/upload/route.ts` (POST multipart)
  - Auth: cookie do Supabase → resolve user → resolve `company_id` (1ª company do usuário; futuro: selector)
  - Valida `project_id` (form field) → membership na company
  - Lê File via FormData; max 10MB raw (`request.body` size check antes de buffer)
  - MIME sniff por magic numbers: `image/jpeg` (FFD8FF), `image/png` (89504E47), `image/webp` (RIFF...WEBP). Rejeita resto.
  - Passa pra `resizePhoto` → upload via admin client em `diary-photos/<company>/<project>/upload-<ts>-<rand6>/<uuid>.jpg`
  - Retorna 201 `{storage_path, width, height, size_bytes}`. Erro: 400 com `clientError(...)`.

### Server actions

- [ ] `createDiaryEntry(projectId, body, uploads[])` em `actions.ts` — chama RPC `insert_diary_entry`, revalida path
- [ ] `deleteDiaryEntry(entryId)` — busca paths das fotos, deleta do Storage via admin, depois DELETE no DB (CASCADE pega photos table)

### UI — `diary-section.tsx`

- [ ] Composer (`diary-composer.tsx`, client):
  - `<textarea>` "O que rolou hoje? (opcional)" 2 rows, autosize
  - Botão "📷 Foto" → `<input type="file" accept="image/*" multiple capture="environment">` (capture pra abrir câmera direto no mobile)
  - Preview thumbnails das fotos selecionadas (FileReader.readAsDataURL pra preview local antes de upload)
  - Upload começa imediatamente após selecionar (chamadas paralelas até 4); barra de progresso por foto
  - Retry com backoff 1s/2s/4s em fail
  - Botão "Postar" desabilitado enquanto upload em andamento OU `body=''` E `uploads.length=0`
  - Submit chama `createDiaryEntry(...)`; em sucesso, limpa form + `router.refresh()`
  - sessionStorage backup do `body` em digitação (recover em F5 acidental)
- [ ] Lista de entradas (`diary-section.tsx`, server):
  - 5 últimas inicialmente; botão "Ver mais" puxa via server action paginada
  - Cada entry: `diary-entry.tsx` (client por causa do lightbox)
- [ ] `diary-entry.tsx`:
  - Cabeçalho: data formatada PT-BR + autor (resolve via `author_id` → `auth.users.email` ou null)
  - Body como texto
  - Grid 4-cols com fotos via `<img>` apontando pra `/api/diary/photo/<photo_id>` (rota nova que valida ownership + redireciona pra signed URL — reusa lógica do link público)
  - Click numa foto abre lightbox simples (componente client, ESC fecha, setinhas navegam)
  - Menu "..." → "Apagar entrada" (confirm dialog)
- [ ] Rota `web/src/app/api/diary/photo/[id]/route.ts` (GET) — autenticada, valida tenant, retorna 307 redirect pra signed URL TTL 1h

### Testes

- [ ] RLS: photos de outro tenant não acessíveis
- [ ] RPC rejeita entry com 21 fotos
- [ ] RPC rejeita entry vazia (body='' AND 0 photos)
- [ ] `resizePhoto` em PNG 4000x3000 retorna JPEG 1200x900 size_bytes < 500KB
- [ ] `resizePhoto` em PDF (não imagem) retorna null
- [ ] Upload route rejeita 11MB file
- [ ] Trigger `tg_touch_project_last_diary` atualiza `projects.last_diary_at` no insert de entry

### Smoke E2E

- [ ] Postar entry com 3 fotos no celular (DevTools mobile emulator OK)
- [ ] Foto tirada de 4000x3000 vira ~1200x900 na visualização
- [ ] Apagar entry remove fotos do Storage (verificar no Supabase Studio)
- [ ] F5 com texto digitado mas não postado: texto recupera da sessionStorage

**Commit:** `feat(obras): diário com fotos (sharp resize, lightbox) (PR 3/6)`

---

## PR 4 — Custos da obra + margem (~1.5 dia)

**Objetivo:** Empreiteiro lança gastos por categoria. Margem real-time visível. Opcionalmente vincula gasto a etapa em execução. Custos são INTERNOS — não aparecem no link público.

### Server actions

- [ ] `addCost(projectId, {category, description, amount_cents, stage_id?, incurred_on})` — zod, scope, stage_id valida que pertence ao mesmo project
- [ ] `updateCost(costId, patch)`
- [ ] `deleteCost(costId)`

### Query

- [ ] `getCostSummary(projectId)` — usa SQL agregado: `select category, sum(amount_cents) from project_costs ... group by category`. Calcula margem buscando `quote.total_cents` reverso via `quotes.project_id = projectId`. Se nenhum quote, margem = `null` (UI mostra "sem orçamento vinculado").

### UI — `costs-section.tsx`

- [ ] Header verde/vermelho com margem:
  - Verde se margem > 0: "Margem atual +24.5%" + breakdown `R$ X receita / -R$ Y custos / = R$ Z lucro`
  - Vermelho se margem < 0: "Atenção: obra no vermelho -5%"
  - Cinza se quote ausente: "Lançe um orçamento pra ver a margem"
- [ ] Lista por categoria com label PT-BR (`Material / MO / Frete / Outros`) + total
- [ ] Botão "+ Lançar gasto" → `cost-form.tsx` (modal/sheet responsivo)
- [ ] Form fields: categoria (select), descrição (input), valor (input com máscara R$ BR), data (date input default hoje), vincular a etapa (optional select de etapas do projeto)
- [ ] **Sugestão inline:** se há etapa `in_progress` e usuário não selecionou `stage_id`, mostrar dica "Vincular à etapa em execução (Colocação de telha)?" com botão.
- [ ] Lista expandível abaixo da margem: "Ver gastos detalhados (N lançamentos)" → expand com lista row-by-row (data, descrição, valor, categoria, etapa, delete)

### Layout responsivo

- [ ] No desktop (≥1024px), `costs-section` e `diary-section` ficam lado-a-lado (grid 2fr 1fr)
- [ ] No mobile, empilhados

### Testes

- [ ] RLS: cost de outro tenant não visível
- [ ] Constraint `cost_amount_chk` rejeita amount=0 e >R$1M
- [ ] `getCostSummary` soma corretamente por categoria
- [ ] `getCostSummary` retorna margin=null quando project não tem quote

### Smoke E2E

- [ ] Lançar 3 gastos em categorias diferentes → margem recalcula
- [ ] Vincular gasto a etapa "Colocação de telha" → aparece com tag da etapa
- [ ] Apagar gasto → margem recalcula

**Commit:** `feat(obras): custos + margem real-time (PR 4/6)`

---

## PR 5 — Ponto da equipe (~2 dias)

**Objetivo:** Encarregado bate ponto por todos os peões do dia. Geolocalização opcional. Histórico acessível.

### Server actions

- [ ] `addTimeEntry(projectId, {worker_name, worker_role, started_at, ended_at?, gps_lat?, gps_lng?, gps_accuracy_m?, notes?, worked_on?})` — zod; calcula `hours_worked` se ended_at; valida unique pelo index parcial e retorna erro amigável ("João já tem ponto fechado hoje")
- [ ] `endTimeEntry(timeId, ended_at)` — fecha ponto aberto, calcula `hours_worked`
- [ ] `updateTimeEntry(timeId, patch)` — admin pode corrigir ponto manualmente (esquecimento)
- [ ] `deleteTimeEntry(timeId)`

### Query

- [ ] `listTimeToday(projectId)` retorna entries de hoje
- [ ] `listTimeHistory(projectId, {limit, before?})` paginado
- [ ] `getWorkerNamesAutocomplete(companyId, query)` — nomes únicos já usados em time_entries da company (`select distinct worker_name from time_entries where company_id=$1 and worker_name ilike $2 limit 10`)

### UI — `time-section.tsx`

- [ ] Header: data de hoje + botão "+ Bater ponto"
- [ ] Lista de pontos do dia: nome | role | started→ended | hours_worked. Em aberto (sem ended_at) tem botão "Fechar ponto" inline.
- [ ] Empty state: "Ninguém bateu ponto ainda hoje" + CTA
- [ ] Link "Ver histórico →" abre rota separada `/app/obras/[id]/ponto` com paginação

### Modal `time-form.tsx`

- [ ] Nome do peão: input com autocomplete (debounce 200ms, fetch via server action `getWorkerNamesAutocomplete`)
- [ ] Role: select "Encarregado / Peão / Outro" (free typing)
- [ ] Entrada/saída: time inputs (default agora pra entrada, vazio pra saída)
- [ ] Data: default hoje
- [ ] Notas: textarea opcional
- [ ] **Capturar geolocalização**: botão "📍 Marcar localização" → `navigator.geolocation.getCurrentPosition` com `enableHighAccuracy:false`, timeout 5s; mostra ✓ se OK, "—" se negado/timeout. Sem geo, segue.
- [ ] **Modo "bater por vários"**: após salvar primeiro ponto, modal NÃO fecha; mostra "Ponto registrado ✓ Bater outro?" com form resetado mas data preservada → permite encarregado bater 3 peões em 30s.

### Rota dedicada `/app/obras/[id]/ponto/page.tsx`

- [ ] Lista paginada full (server component), agrupada por data
- [ ] Filtro por nome de peão
- [ ] Export CSV (futuro — não neste PR)

### Testes

- [ ] RLS: time_entries de outro tenant não visíveis
- [ ] Unique partial: 2º insert com mesmo (project, worker_name, worked_on, ended_at not null) falha
- [ ] `hours_worked` calculado corretamente: 07:30 → 17:00 = 9.5

### Smoke E2E

- [ ] Bater ponto de 3 peões em sequência (modo continuação)
- [ ] Tentar bater 2º ponto do mesmo peão no mesmo dia → erro amigável
- [ ] Fechar um ponto aberto (que ficou só com entrada) → `hours_worked` aparece
- [ ] Negar geolocation → ponto salva sem GPS

**Commit:** `feat(obras): ponto da equipe (foreman proxy + geo opcional) (PR 5/6)`

---

## PR 6 — Link público + status manual + templates settings (~2.5 dias)

**Objetivo:** Cliente abre o mesmo link `/q/[token]` e vê andamento da obra. Empreiteiro muda status manualmente com sugestões inline. Custom templates editáveis em settings.

### Atualizar `/q/[token]/page.tsx`

- [ ] Server component: se `quote.project_id is not null`, busca `getProjectWithRelations` (sem custos, sem ponto, sem endereço completo — função nova `getProjectPublicView(projectId)` que filtra os campos)
- [ ] Renderiza toggle/tabs "📋 Orçamento | 🏗️ Andamento" no topo
- [ ] Default tab: Andamento (se project_id) ou Orçamento (sem)

### Componente novo `andamento-view.tsx` (client)

- [ ] Header: title + status pill traduzido + cidade/UF (NÃO endereço completo) + data início
- [ ] Barra de progresso + "X de Y etapas concluídas"
- [ ] Lista de etapas: nome + ✓ se done, "em execução" se in_progress, cinza se todo. SEM datas detalhadas (só "concluído em DD/MM" e "previsto DD/MM").
- [ ] Diário: últimas 10 entradas, body + grid de fotos (`<img src="/q/[token]/photo/[id]">`). SEM autor, SEM hora detalhada. Botão "Ver mais" se >10.
- [ ] Footer: "Atualizado em DD/MM/YYYY HH:MM" (last_diary_at ou updated_at do project)

### Rota nova `/q/[token]/photo/[id]/route.ts`

- [ ] GET handler anon
- [ ] Valida photo_id → busca photo + project + quote → valida que `quote.share_token === token` (constant-time `tokensMatch`)
- [ ] Gera signed URL TTL 1h via admin client → `redirect(signedUrl, 307)`
- [ ] Cache-Control: `private, max-age=3600` no response do redirect (browser cacheia o redirect; signed URL tem própria TTL)

### Server action `getProjectPublicView(projectId)` (helper, não action)

- [ ] Busca project + customer.city/state (não address) + stages (sem `notes`) + diary com photos (sem `author_id`)
- [ ] Retorna shape específico PublicProjectView — TypeScript garante que custos/ponto nunca podem vazar

### Status manual + sugestões

- [ ] Header do painel ganha menu "Mudar status" funcional:
  - `planning → in_progress` (quando empreiteiro tá pronto)
  - `in_progress → paused` (com prompt "Por quê?" → cria diary entry automático com motivo)
  - `paused → in_progress`
  - `* → cancelled` (modal "Tem certeza? Essa ação é raramente reversível.")
  - `in_progress → completed` (com confirm)
- [ ] Server action `updateProjectStatus(projectId, status, reason?)` — valida transição via `canTransitionStatus`
- [ ] **Sugestões inline (banner no topo do painel):**
  - Se project=`planning` e há etapa `in_progress`: "Comece a obra oficialmente? [Marcar como Em execução]"
  - Se project=`in_progress` e TODAS etapas=`done`: "Última etapa concluída! [Marcar obra como Concluída]"
  - Se project=`in_progress` e nenhuma etapa mudou em >7 dias: "A obra parou? [Marcar como Pausada]" (este último é opcional, fica pra Fase 1.4 se complicar)

### Templates custom em settings

- [ ] Rota nova `web/src/app/app/configuracoes/templates/page.tsx` — lista de templates (system disabled, custom editáveis)
- [ ] `template-form.tsx` — criar/editar template: nome + lista de items (name + est_days) com drag-to-reorder, add row, delete row
- [ ] `actions.ts`: `createTemplate`, `updateTemplate`, `deleteTemplate` — validar que não-system, validar que se template está em uso por algum project, delete bloqueia (mensagem: "Em uso em N obras — desvincule antes")
- [ ] Sidebar: adicionar submenu sob "Configurações" → "Templates de obra"

### Testes

- [ ] Smoke crítico de segurança: abrir `/q/[token]` em sessão anônima → toggle "Andamento" → DevTools Network: response do RSC NÃO contém strings "amount_cents", "worker_name", "started_at", endereço completo. Se contiver → fail.
- [ ] `/q/[token]/photo/[id]` com token errado → 404
- [ ] `/q/[token]/photo/[id]` com photo de outro project → 404
- [ ] `updateProjectStatus` rejeita transição inválida
- [ ] `deleteTemplate` bloqueia se em uso

### Smoke E2E completo

- [ ] Empreiteiro: cria obra do quote → instancia template → marca primeira etapa "em execução" → vê sugestão "Marcar obra como Em execução" → aceita
- [ ] Empreiteiro: posta diário com 4 fotos
- [ ] Cliente (sessão anônima, mesma URL `/q/...`): vê toggle "Andamento" → vê 6 etapas, 1 em execução; vê diário com 4 fotos; NÃO vê custos nem ponto; endereço só "Teresina/PI"
- [ ] Empreiteiro: marca todas etapas como done → vê sugestão "Marcar como Concluída" → aceita → status pill atualiza no link público
- [ ] Empreiteiro: cria template custom "Telhado industrial" com 4 etapas → cria nova obra → "Telhado industrial" aparece no select

**Commit:** `feat(obras): link público + status + templates settings (PR 6/6)`

---

## Gates de fim-de-fase (depois do PR 6)

- [ ] `pnpm tsc --noEmit` limpo
- [ ] `pnpm build` limpo
- [ ] Lint sem warnings
- [ ] Code-review automático (`/ultrareview` ou agente equivalente) na branch antes de merge
- [ ] Security review focado em: RLS de todas as 7 tabelas, signed URL não vaza, status transitions, RPC SECURITY DEFINER (`set search_path=public` em ambas)
- [ ] Smoke E2E completo (lista acima)
- [ ] Documentação: README do PR menciona se há env vars novas (não deve haver)
- [ ] Tag de release: `v1.3.0`

---

## Ordem de dependência entre PRs

```
PR 1 (schema) ─┬─► PR 2 (etapas) ──────────┐
               ├─► PR 3 (diário) ──────────┤
               ├─► PR 4 (custos) ──────────┼─► PR 6 (público + status + templates)
               └─► PR 5 (ponto) ───────────┘
```

PR 2, 3, 4, 5 podem ser desenvolvidos em paralelo (após PR 1 mergeado). PR 6 depende de 2 e 3 (link público mostra etapas + fotos). 4 e 5 são internos, não afetam link público.

Pra um dev solo: ordem sequencial PR1→2→3→4→5→6. Pra alocar mais devs no futuro: PRs 2-5 paralelizáveis.

---

## Riscos durante a implementação (já cobertos no spec §14, com mitigação operacional)

- **Upload `sharp` falha no Vercel Edge:** garantir build target `nodejs` (não `edge`) na route `/api/diary/upload`. Adicionar `export const runtime = 'nodejs'`.
- **Cookies + admin client misturados:** padrão já estabelecido na Fase 1.2 — `createSupabaseAdmin()` em `server-only`, nunca exportado de barrel.
- **`@dnd-kit` adiciona bundle:** ~30KB gzip. Aceitável. Alternativa: drag custom com pointer events (mais código nosso). **Decisão na hora do PR 2:** se tempo apertado, usar "↑↓" buttons em vez de drag — funcional, sem dep nova. Drag fica como upgrade depois.
- **Foto upload via mobile data ruim:** sem Service Worker, o usuário fica preso. Mitigação no PR 3: retry agressivo + toast "Tenta de novo na chuva quando o sinal voltar 😅". Se virar dor real, Fase 1.5 implementa offline.

---

*Fim do plano. Cada PR tem checklist próprio — marcar `[x]` à medida que avança. Após PR 1, podemos abrir branches paralelas.*
