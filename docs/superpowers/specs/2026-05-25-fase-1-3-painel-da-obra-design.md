# Fase 1.3 — Painel da Obra — Design Doc

**Status:** aprovado (brainstorming) · pronto pra plano de implementação
**Autor:** Claude (engenheiro sênior) + Arthur Godinho (fundador)
**Data:** 2026-05-25
**Branch alvo:** `main`
**Pré-requisito:** Fase 1.2 (orçamentos + aprovação + convertToProject) em produção

---

## 1. Por que existe

Hoje, quando o cliente aprova um orçamento e ele vira obra (`/app/obras/[id]`), a tela é só um placeholder com 4 campos básicos. **O painel da obra é o produto operacional que o empreiteiro abre todo dia durante a execução.** É onde ele:

- Marca o que avançou hoje pra não perder o ritmo
- Tira foto do telhado pra mostrar pro cliente sem ter que ir lá
- Lança o gasto de material no calor do momento (senão esquece) e enxerga se a obra ainda tá dando margem
- Bate o ponto dos peões sem precisar de papel ou planilha
- Reusa o **mesmo link público do orçamento aprovado** pra mostrar pro cliente o andamento — esse é o "uau" duradouro do produto, não só o do fechamento.

A Fase 1.2 vendeu o produto. **A Fase 1.3 prende o cliente no produto** — é o que evita churn no segundo mês.

**Critério de sucesso:**
1. Um empreiteiro consegue, no celular, em ≤2 minutos, postar diário com 3 fotos + bater ponto da equipe + lançar 1 gasto. (medido em produção via PostHog quando subir)
2. O cliente abre o mesmo link `/q/[token]` que aprovou o orçamento e vê o avanço da obra com fotos — sem precisar de novo email, novo cadastro, nada.
3. Margem da obra (receita − custos) calculada em tempo real, visível antes de fechar.

---

## 2. Escopo

### Em escopo (6 funcionalidades — decisão do fundador: tudo junto, ~12-14 dias)

1. **Etapas da obra** — checklist ordenado, com templates por tipo de obra (Cobertura nova / Reforma / Manutenção) e custom em settings
2. **Diário de obra** — texto + até 20 fotos por entrada, upload direto pelo celular, server-side resize via `sharp`
3. **Custos da obra** — lançamentos por categoria (Material / MO / Frete / Outros), margem real-time, opcional vincular a etapa
4. **Ponto da equipe** — encarregado bate por todos (modo proxy), geolocalização capturada do celular do encarregado, lista hoje + histórico
5. **Status da obra** — manual com sugestões inline ("Última etapa concluída → marcar obra como Concluída?"), 5 estados (planning, in_progress, paused, completed, cancelled)
6. **Link público pro cliente** — **reusa o mesmo `share_token` do orçamento aprovado** (continuidade); página `/q/[token]` ganha uma view "Andamento" se o quote já virou projeto. Mostra status, etapas concluídas, fotos do diário. **Esconde custos, ponto e endereço completo.**

### Fora de escopo (Fase 1.4+)

- Notificação automática ao cliente quando há nova foto no diário (Resend/WhatsApp)
- Comentários do cliente no link público (chat assíncrono)
- Geolocalização de peão individual (cada um com app próprio) — Fase 2 quando peão for usuário pago
- Cronograma estilo Gantt com dependências — overkill pra cobertura
- Aprovação digital de etapa pelo cliente (medição) — Fase 2
- Integração com folha de pagamento (gerar holerite do ponto) — Fase 3
- Materiais (catálogo, requisição, estoque) — Fase 1.4
- Cobrança financeira por obra (Asaas) — Fase 1.4
- Offline-first PWA com Service Worker e sync queue — Fase 1.5 (online-only no MVP, mas com retry/optimistic UI agressivos)
- Watermark/marca d'água em fotos — Fase 2

### Estimativa

~12-14 dias divisíveis em **~6 PRs incrementais** (1 por funcionalidade, mais o PR de schema/setup).

---

## 3. Schema (DB)

Migration única `supabase/migrations/20260528000001_obra_panel.sql` (idempotente, drop-then-create no padrão das anteriores). Toda nova tabela tem RLS ativo + 4 policies tenant-scoped (select/insert/update/delete por `company_id in (select public.user_company_ids())`).

### 3.1 Tabela nova — `stage_templates`

Templates de etapas por tipo de obra. **Sistema** (preset, `company_id is null`) + custom da empresa.

```sql
create table public.stage_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade, -- null = preset do sistema
  name        text not null,                                          -- ex: "Cobertura nova"
  description text,
  is_system   boolean not null default false,                         -- preset não-editável
  position    int not null default 0,                                 -- ordem de exibição
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index stage_templates_company_idx on public.stage_templates (company_id, position);
alter table public.stage_templates enable row level security;
-- SELECT: company_id is null OR company_id in user_company_ids()
-- INSERT/UPDATE/DELETE: company_id in user_company_ids() AND is_system = false
```

### 3.2 Tabela nova — `stage_template_items`

Etapas dentro de cada template.

```sql
create table public.stage_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.stage_templates(id) on delete cascade,
  position    int not null default 0,
  name        text not null,                                  -- ex: "Remoção do telhado antigo"
  est_days    int,                                            -- previsão em dias (opcional)
  created_at  timestamptz not null default now()
);
create index stage_template_items_template_idx on public.stage_template_items (template_id, position);
alter table public.stage_template_items enable row level security;
-- SELECT policy via join no template: usuário vê se vê o template
-- INSERT/UPDATE/DELETE: só em template da própria empresa (não system)
```

**Seed (no próprio migration):** 3 templates de sistema com etapas:

- **Cobertura nova:** Remoção telhado antigo (1d), Reparo estrutural (2d), Manta asfáltica (1d), Colocação de telha (4d), Calhas e rufos (3d), Limpeza e entrega (1d)
- **Reforma de cobertura:** Vistoria (1d), Substituição de telhas quebradas (2d), Reparo de calhas (2d), Pintura/impermeabilização (2d), Limpeza (1d)
- **Manutenção/Limpeza:** Vistoria (1d), Limpeza de calhas (1d), Aplicação de selante (1d), Entrega (½d)

### 3.3 Tabela nova — `project_stages`

Etapas reais de uma obra (instanciadas do template no convertToProject ou criadas avulso).

```sql
create type public.stage_status as enum ('todo', 'in_progress', 'done');

create table public.project_stages (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  position        int not null default 0,
  name            text not null,
  status          public.stage_status not null default 'todo',
  est_days        int,                                        -- previsão
  started_on      date,
  completed_on    date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint stage_name_len_chk        check (char_length(name) between 1 and 200),
  constraint stage_notes_len_chk       check (notes is null or char_length(notes) <= 2000)
);

create index project_stages_project_idx on public.project_stages (project_id, position);
create unique index project_stages_project_position_uq on public.project_stages (project_id, position);
alter table public.project_stages enable row level security;
-- 4 policies tenant-scoped padrão
```

**Regra de negócio (não é constraint, é validação na action):** Só uma etapa pode ter `status = 'in_progress'` por projeto por vez. A UI auto-promove a próxima ao concluir a atual.

### 3.4 Tabela nova — `diary_entries`

Diário da obra.

```sql
create table public.diary_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  author_id   uuid references auth.users(id),
  body        text not null,                                  -- "O que rolou hoje?" (opcional na UI mas com placeholder; permitimos vazio se houver foto)
  weather     text,                                           -- futuro
  created_at  timestamptz not null default now(),

  constraint diary_body_len_chk check (char_length(body) <= 2000)
);

create index diary_entries_project_idx on public.diary_entries (project_id, created_at desc);
alter table public.diary_entries enable row level security;
-- 4 policies tenant-scoped padrão
```

### 3.5 Tabela nova — `diary_photos`

Fotos do diário. Path no Storage segue `diary-photos/<company_id>/<project_id>/<entry_id>/<photo_id>.<ext>`.

```sql
create table public.diary_photos (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.diary_entries(id) on delete cascade,
  project_id      uuid not null references public.projects(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  storage_path    text not null,                              -- caminho no bucket diary-photos
  width           int,
  height          int,
  size_bytes      int not null,
  position        int not null default 0,
  created_at      timestamptz not null default now(),

  constraint diary_photo_size_chk check (size_bytes between 1 and 5242880),  -- 5 MB hard limit
  constraint diary_photo_path_len_chk check (char_length(storage_path) <= 500)
);

create index diary_photos_entry_idx on public.diary_photos (entry_id, position);
alter table public.diary_photos enable row level security;
-- 4 policies tenant-scoped padrão
```

**Constraint adicional:** máximo 20 fotos por entry. **Não dá pra fazer com check** sem trigger; vamos fazer **validação na server action** + um **assert defensivo** numa SECURITY DEFINER `insert_diary_entry(p_project_id, p_body, p_photos jsonb)` que cria entry+photos numa transação e rejeita se `jsonb_array_length(p_photos) > 20`.

### 3.6 Tabela nova — `project_costs`

Custos lançados pelo empreiteiro.

```sql
-- Labels PT-BR exibidos na UI: material → "Material", labor → "MO (Mão de obra)",
-- freight → "Frete", other → "Outros". Enum em inglês por convenção do projeto.
create type public.cost_category as enum ('material', 'labor', 'freight', 'other');

create table public.project_costs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  stage_id     uuid references public.project_stages(id) on delete set null, -- opcional
  category     public.cost_category not null,
  description  text not null,                                 -- "Telha cerâmica 12x"
  amount_cents bigint not null,                               -- positivo, em centavos
  incurred_on  date not null default current_date,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),

  constraint cost_amount_chk check (amount_cents between 1 and 100000000), -- entre R$ 0,01 e R$ 1.000.000
  constraint cost_description_len_chk check (char_length(description) between 1 and 200)
);

create index project_costs_project_idx on public.project_costs (project_id, incurred_on desc);
create index project_costs_stage_idx on public.project_costs (stage_id) where stage_id is not null;
alter table public.project_costs enable row level security;
-- 4 policies tenant-scoped padrão
```

### 3.7 Tabela nova — `time_entries` (ponto)

Cada linha é UM dia/UM peão. Encarregado bate por todos.

```sql
create table public.time_entries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  worker_name     text not null,                              -- nome do peão (free-form pra MVP)
  worker_role     text,                                       -- "encarregado" | "peão" | livre
  worked_on       date not null default current_date,
  started_at      time not null,                              -- 07:30
  ended_at        time,                                       -- null se ainda em campo
  hours_worked    numeric(4,2),                               -- calculado client/action (8.5 = 8h30)
  gps_lat         numeric(9,6),                               -- opcional
  gps_lng         numeric(9,6),                               -- opcional
  gps_accuracy_m  int,                                        -- accuracy reportada pelo browser
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),

  constraint te_worker_name_len_chk check (char_length(worker_name) between 1 and 100),
  constraint te_hours_chk           check (hours_worked is null or hours_worked between 0 and 24),
  constraint te_notes_len_chk       check (notes is null or char_length(notes) <= 500)
);

create index time_entries_project_date_idx on public.time_entries (project_id, worked_on desc);
create unique index time_entries_dedup_uq
  on public.time_entries (project_id, worker_name, worked_on)
  where ended_at is not null;
alter table public.time_entries enable row level security;
-- 4 policies tenant-scoped padrão
```

**Por que `worker_name` é text e não FK pra `employees`:** a tabela `employees` ainda não existe (Fase 2). Pra MVP, encarregado digita o nome ou escolhe de autocomplete que cresce com uso (similar ao catalog_items do 1.2). Quando criarmos `employees`, fazemos migration que liga as duas — `worker_name` continua existindo como fallback/histórico.

### 3.8 Bucket Storage — `diary-photos` (privado)

```sql
insert into storage.buckets (id, name, public) values ('diary-photos', 'diary-photos', false)
  on conflict do nothing;

-- Nenhuma policy authenticated nem anon — upload e leitura via admin client server-side.
-- O link público gera signed URLs com expiração de 1h por foto.
```

**Path convention:** `diary-photos/<company_id>/<project_id>/upload-<unix_ms>-<random6>/<uuid>.jpg`. **Sempre `.jpg`** porque o pipeline server-side faz resize via `sharp` e força output JPEG. O `entry_id` NÃO entra no path (a foto é uploadada antes do entry existir); a relação fica em `diary_photos.entry_id` no DB. Trade-off documentado em §7 (orfanização possível, mitigada por cron na Fase 1.4).

### 3.9 Alterações em `projects`

```sql
alter table public.projects
  add column if not exists template_id          uuid references public.stage_templates(id) on delete set null,
  add column if not exists progress_pct         numeric(5,2),  -- denormalizado, atualizado por trigger
  add column if not exists last_diary_at        timestamptz;

-- Trigger pra recalcular progress_pct quando stages mudam
create or replace function public.tg_recalc_project_progress()
returns trigger language plpgsql as $$
declare
  v_project_id uuid;
  v_done int;
  v_total int;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select
    count(*) filter (where status = 'done'),
    count(*)
  into v_done, v_total
  from public.project_stages
  where project_id = v_project_id;

  update public.projects
    set progress_pct = case when v_total = 0 then 0 else round(v_done::numeric * 100 / v_total, 2) end
  where id = v_project_id;

  return null;
end;
$$;

create trigger project_stages_recalc_progress
  after insert or update or delete on public.project_stages
  for each row execute function public.tg_recalc_project_progress();

-- Trigger pra atualizar last_diary_at
create or replace function public.tg_touch_project_last_diary()
returns trigger language plpgsql as $$
begin
  update public.projects set last_diary_at = new.created_at where id = new.project_id;
  return null;
end;
$$;
create trigger diary_entries_touch_project
  after insert on public.diary_entries
  for each row execute function public.tg_touch_project_last_diary();
```

### 3.10 RPC atômico — `insert_diary_entry`

```sql
create or replace function public.insert_diary_entry(
  p_project_id uuid,
  p_company_id uuid,
  p_body       text,
  p_photos     jsonb         -- [{storage_path,width,height,size_bytes,position}, ...]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  -- Authz
  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Project deve pertencer à company
  if not exists (
    select 1 from public.projects
    where id = p_project_id and company_id = p_company_id
  ) then
    raise exception 'project not found' using errcode = '42501';
  end if;

  if jsonb_array_length(coalesce(p_photos, '[]'::jsonb)) > 20 then
    raise exception 'too many photos' using errcode = '22023';
  end if;

  -- body + 0 fotos é rejeitado: pelo menos texto OU pelo menos 1 foto
  if (p_body is null or btrim(p_body) = '') and jsonb_array_length(coalesce(p_photos, '[]'::jsonb)) = 0 then
    raise exception 'empty entry' using errcode = '22023';
  end if;

  insert into public.diary_entries (project_id, company_id, author_id, body)
    values (p_project_id, p_company_id, auth.uid(), coalesce(p_body, ''))
    returning id into v_entry_id;

  insert into public.diary_photos (entry_id, project_id, company_id, storage_path, width, height, size_bytes, position)
  select
    v_entry_id, p_project_id, p_company_id,
    el->>'storage_path',
    (el->>'width')::int,
    (el->>'height')::int,
    (el->>'size_bytes')::int,
    coalesce((el->>'position')::int, row_number() over () - 1)
  from jsonb_array_elements(p_photos) el;

  return v_entry_id;
end;
$$;

grant execute on function public.insert_diary_entry(uuid,uuid,text,jsonb) to authenticated;
```

### 3.11 RPC — `instantiate_template_stages`

Usado pelo `convertToProject` (chamada do orçamento aprovado) e por botão "Aplicar template" no painel.

```sql
create or replace function public.instantiate_template_stages(
  p_project_id  uuid,
  p_company_id  uuid,
  p_template_id uuid
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
begin
  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.projects
    where id = p_project_id and company_id = p_company_id
  ) then
    raise exception 'project not found' using errcode = '42501';
  end if;

  -- Template tem que ser do system OU da própria company
  if not exists (
    select 1 from public.stage_templates
    where id = p_template_id and (company_id is null or company_id = p_company_id)
  ) then
    raise exception 'template not accessible' using errcode = '42501';
  end if;

  insert into public.project_stages (project_id, company_id, position, name, est_days)
  select p_project_id, p_company_id, sti.position, sti.name, sti.est_days
  from public.stage_template_items sti
  where sti.template_id = p_template_id
  order by sti.position;

  get diagnostics v_inserted = row_count;

  update public.projects set template_id = p_template_id where id = p_project_id;

  return v_inserted;
end;
$$;
grant execute on function public.instantiate_template_stages(uuid,uuid,uuid) to authenticated;
```

---

## 4. Rotas & estrutura de arquivos

```
web/src/
├── lib/
│   ├── queries/
│   │   ├── projects.ts           # +getProjectWithRelations (stages, diary, costs, time, totals)
│   │   ├── stage-templates.ts    # listTemplates(companyId), getTemplate(id)
│   │   ├── diary.ts              # listDiary(projectId, {limit, before})
│   │   ├── costs.ts              # listCosts(projectId), getCostSummary(projectId)
│   │   └── time.ts               # listTimeToday(projectId), listTimeHistory(projectId)
│   ├── photos/
│   │   └── resize.ts             # sharp wrapper: resize to 1200px, jpeg q=82, strip EXIF
│   ├── supabase/
│   │   └── storage.ts            # +uploadDiaryPhoto, +signedDiaryPhotoUrl, +deleteDiaryPhoto
│   └── project-status.ts         # helpers de transição manual com sugestões
│
├── app/
│   ├── app/
│   │   ├── obras/
│   │   │   ├── page.tsx                       # lista (já existe — atualizar c/ progress + last_diary)
│   │   │   └── [id]/
│   │   │       ├── page.tsx                   # painel completo (RSC, busca tudo paralelo)
│   │   │       ├── project-header.tsx         # client: title + status pill + change-status menu
│   │   │       ├── stages-section.tsx         # client: lista de etapas + drag-to-reorder (mobile-safe)
│   │   │       ├── stage-row.tsx              # client: 1 etapa, expand inline c/ dates/notes
│   │   │       ├── diary-section.tsx          # server + client island
│   │   │       ├── diary-composer.tsx         # client: input + upload + post
│   │   │       ├── diary-entry.tsx            # client: foto grid + lightbox
│   │   │       ├── costs-section.tsx          # server + client island
│   │   │       ├── cost-form.tsx              # modal/sheet "+ Lançar gasto"
│   │   │       ├── time-section.tsx           # client
│   │   │       ├── time-form.tsx              # modal "+ Bater ponto"
│   │   │       ├── public-link-callout.tsx    # banner com URL pública
│   │   │       └── actions.ts                 # todas as server actions deste painel
│   │   └── configuracoes/
│   │       └── templates/                     # CRUD de templates custom
│   │           ├── page.tsx
│   │           ├── template-form.tsx
│   │           └── actions.ts
│   │
│   ├── q/[token]/
│   │   ├── page.tsx              # ⭐ ATUALIZAR: se quote tem project_id, renderiza tab "Andamento"
│   │   ├── andamento-view.tsx    # client: stages + diary photos (sem custos/ponto/endereço completo)
│   │   └── photo/[id]/route.ts   # streama foto via signed URL (anon, valida ownership pelo token)
│   │
│   └── api/
│       └── diary/
│           └── upload/route.ts   # POST multipart, resize, upload, retorna {storage_path,...}
│
└── middleware.ts                 # /q/* já é público; nada a mudar
```

### Sidebar / nav

- Adicionar **Templates de obra** dentro de `/app/configuracoes` (não no top-level)
- Bottom nav mobile: nenhuma mudança (Obras já tá lá)
- Link "Configurações" no rodapé do sidebar — adicionar entrada de submenu

---

## 5. UX — layout do painel

**Decisão tomada:** lista vertical sequencial pra etapas + secções empilhadas. Mesmo layout mobile/desktop, sem responsive break complicado. Já validado no mockup `03-painel-completo.html`.

**Estrutura de cima pra baixo** (single column, max 900px no desktop, full-width mobile):

1. **Header** — título + endereço + pill de status + data de início + (right-aligned) menu de status
2. **Andamento** (card) — barra de progresso 50% + linha "X de Y etapas concluídas" + lista de etapas com checkbox/pill, etapa em execução destacada (fundo amber). Botão "+ Adicionar etapa" no fim.
3. **Diário** (card) — input textarea + botão câmera + botão Postar; abaixo, entradas reversas cronológicas com grid de fotos 4-cols + lightbox.
4. **Custos** (card, lado-a-lado com Diário no desktop ≥1024px, empilhado no mobile) — margem em destaque (verde se +, vermelho se −) + lista por categoria + total + "+ Lançar gasto".
5. **Ponto** (card) — data + botão "+ Bater ponto" + lista do dia + link "Ver histórico →".
6. **Link público** (card informativo) — "O cliente abre o mesmo link [URL] e vê: status, etapas concluídas e fotos. Custos e ponto são internos."

**Breakpoints:**

- `< 768px`: tudo single column; cards full-width; modais viram bottom sheets.
- `≥ 1024px`: Diário + Custos lado-a-lado (2fr 1fr), resto continua single column. Max-width 900px centralizado.

**Cores e tipografia:** seguem tokens existentes (`primary` = laranja `#f97316`, verde para sucesso, amber pra "em execução"). Nada novo no design system.

---

## 6. State machine — Status da obra

```
planning ────▶ in_progress ────▶ completed
   │              │   ▲
   │              ▼   │
   │           paused
   │              │
   └──────────────┴──▶ cancelled (terminal, mas reversível com confirmação)
```

**Regras:**

- `planning → in_progress`: manual. **Sugestão inline** quando o usuário marca a primeira etapa como `in_progress`: toast "Marcar obra como Em execução?" com botão.
- `in_progress → completed`: manual. **Sugestão inline** quando a última etapa vira `done`: card "Última etapa concluída — marcar obra como Concluída?" com botão Marcar Concluída. Não auto-completa (empreiteiro pode querer adicionar "Limpeza" depois).
- `in_progress → paused`: manual (chuva, atraso de material, cliente sumiu). Diary entry opcional pedindo motivo.
- `paused → in_progress`: manual, sem sugestão.
- `* → cancelled`: manual, modal de confirmação "Cancelar obra é raro. Tem certeza?".

**Permissões:**

- Só `owner` e `manager` mudam status. `foreman` (futuro) só marca etapas/diário/ponto.
- Pra MVP, todo membro da company é tratado como manager (no schema atual `company_members` não tem role granular; vai vir na Fase 2).

---

## 7. Server actions — superfície completa

Todas em `web/src/app/app/obras/[id]/actions.ts` (exceto onde indicado), com `"use server"` e `revalidatePath('/app/obras/[id]')` no fim. Padrão idêntico ao da Fase 1.2.

### Etapas
- `addStage(projectId, name, est_days?)`
- `updateStage(stageId, patch)` — name, est_days, notes
- `setStageStatus(stageId, status)` — valida only-one-in-progress; promove próxima se done
- `reorderStages(projectId, ids[])` — atualiza positions via UPDATE single SQL
- `deleteStage(stageId)`
- `applyTemplate(projectId, templateId)` — chama RPC; rejeita se já houver etapas (UI confirma)

### Diário
- `createDiaryEntry(projectId, body, uploads[])` — chama RPC `insert_diary_entry`
- `deleteDiaryEntry(entryId)` — admin client apaga photos do bucket + DELETE cascata
- Upload de foto: **API route** `/api/diary/upload` (não server action — multipart binário é melhor em route handler com Web Streams)
  - Recebe File, valida MIME (`image/jpeg|png|webp`), tamanho ≤ 10MB **antes** do resize, passa pra `sharp` (cap `limitInputPixels` em 24MP), resize maior-lado=1200, jpeg q=82, strip EXIF, upload pro Storage com path `diary-photos/<company>/<project>/<tmp>/<uuid>.jpg`. Retorna `{storage_path, width, height, size_bytes}`.
  - Depois do submit do entry, o RPC consolida os paths num entry oficial; um job leve "move" os arquivos do path `tmp` pro path final `<entry_id>` (ou aceitamos o path tmp como definitivo — **decisão: aceitar tmp como definitivo, sem move**, simplifica e evita 2 escritas).
  - Path real fica: `diary-photos/<company>/<project>/upload-<timestamp>-<random>/<uuid>.jpg`. O entry_id não vai no path, mas vai na coluna `diary_photos.entry_id`. **Trade-off conhecido:** orfanização possível se upload feito mas entry nunca submetido. Mitigação: cron diário de limpeza (Fase 1.4) que apaga `diary_photos` órfãs >24h. Por ora aceito o lixo.

### Custos
- `addCost(projectId, {category, description, amount_cents, stage_id?, incurred_on})`
- `updateCost(costId, patch)`
- `deleteCost(costId)`

### Ponto
- `addTimeEntry(projectId, {worker_name, worker_role, started_at, ended_at?, gps_*?, notes})` — calcula hours_worked se ended_at; usa unique index pra previnir duplicata mesmo-peão-mesmo-dia.
- `updateTimeEntry(timeId, patch)` — usado pra "fechar" um ponto que ficou em aberto
- `deleteTimeEntry(timeId)`
- `endTimeEntry(timeId, ended_at)` — atalho que fecha o ponto e calcula hours

### Status
- `updateProjectStatus(projectId, status)` — valida transição, log audit (futuro), revalida path

### Templates (separado, em `/app/configuracoes/templates/actions.ts`)
- `createTemplate(name, items[])`
- `updateTemplate(id, name, items[])`
- `deleteTemplate(id)`
- Templates de sistema **não** são editáveis nem deletáveis (`is_system = true` validado na action).

---

## 8. Link público — `/q/[token]` reusando da Fase 1.2

A página `web/src/app/q/[token]/page.tsx` já existe. Mudanças:

1. **Detectar projeto vinculado:** ao carregar quote, se `quote.project_id is not null`, expor um toggle "📋 Orçamento ↔ 🏗️ Andamento da obra" no topo.
2. **View "Andamento"** (`andamento-view.tsx`, client component):
   - Header: nome da obra + status pill ("Em execução" / "Concluída" / etc.)
   - **Endereço:** mostra só cidade/UF (não rua/número) — privacidade
   - Barra de progresso + linha "X de Y etapas concluídas"
   - Lista de etapas (todas, com ✓ nas concluídas, "em execução" destacado, futuras em cinza)
   - Diário: últimas 10 entradas, **apenas texto + fotos** (sem autor, sem horário detalhado — só data)
   - Link "Ver mais" se >10 entradas
3. **O que está escondido do cliente:** custos, margem, ponto/peões, endereço completo, `incurred_on`, autor.
4. **Fotos via signed URL:** `/q/[token]/photo/[id]/route.ts`
   - Recebe token + photo_id
   - Valida que photo pertence a um project cujo quote tem aquele share_token
   - Gera signed URL do bucket `diary-photos` com TTL 1h
   - Faz `redirect(signedUrl)` — sem proxy de bytes (economiza bandwidth do Vercel)

**Por que reusar o token e não criar um novo:**
- Continuidade pro cliente: ele já recebeu o link via WhatsApp na aprovação; volta no mesmo.
- Menos um vetor de UX/credenciais pra gerenciar.
- Token já é constant-time-compared (helper `tokensMatch` da Fase 1.2 — reusar).
- Se o quote for cancelado/reverso, o link continua válido mas mostra "Orçamento" sem aba "Andamento" (project_id = null).

**Cache HTTP:**
- Página HTML: `Cache-Control: private, max-age=0, must-revalidate` (sempre fresh — diário muda)
- Signed URL de foto: o próprio Supabase retorna foto com cache headers; nossa redirect não interfere.

---

## 9. Segurança & LGPD

### RLS

Todas as novas tabelas usam o mesmo padrão da Fase 1.2:

```sql
create policy "tenant_select" on public.X for select to authenticated
  using (company_id in (select public.user_company_ids()));
create policy "tenant_insert" on public.X for insert to authenticated
  with check (company_id in (select public.user_company_ids()));
create policy "tenant_update" on public.X for update to authenticated
  using  (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));
create policy "tenant_delete" on public.X for delete to authenticated
  using (company_id in (select public.user_company_ids()));
```

**Storage `diary-photos`:** NENHUMA policy de RLS — acesso só via admin client. Anon nunca chama Storage direto. Link público vai via API route que valida token e devolve signed URL.

### Validação de input
- Todas server actions têm Zod schema na entrada (mesmo padrão da 1.2).
- Tamanho de foto: validado **no API route**, antes de chamar `sharp`. Hard cap 10MB raw, 5MB depois do resize (constraint do DB).
- `sharp` com `limitInputPixels: 24_000_000` pra previnir DoS via bomba de zip-bomb-de-pixels (ex: 50000x50000px JPEG).
- MIME sniffing real: pegar primeiros bytes e checar magic numbers (não confiar no `Content-Type` do client).
- Geolocalização: opcional, do navegador. Se permitido, grava `gps_lat/lng/accuracy_m`. **Não rastreamos em background** — captura no momento do submit.

### LGPD
- Fotos do diário contêm PII (telhado da casa do cliente, possivelmente vizinhos). Bucket privado, signed URLs com TTL 1h.
- Endereço completo da obra escondido no link público.
- Nome de peão é text livre — **não consideramos PII sensível** pra MVP (não tem CPF, não tem telefone). Quando virar `employees`, aí sim ganha tratamento de DPO.
- Direito ao esquecimento: deletar customer faz CASCADE em projects (restrict hoje — vamos manter restrict, mas `delete_customer_full` RPC futura faz a cadeia)

### Audit / imutabilidade
- Por ora **não** criamos `audit_logs` pra status changes. Vai na Fase 2. Trade-off aceito: perde traceability fina mas evita complexidade no MVP.

---

## 10. Performance

### Queries
- `getProjectWithRelations`: 6 queries paralelas no RSC (stages, diary+photos last 5, costs total + last 10, time today, time history count, customer/company). Promise.all.
- Diário paginado: 5 entradas inicialmente, "Ver mais" paginha offset/limit.
- Custos: lista completa (custos não são muitos, raramente >50 por obra).
- Ponto: hoje + últimos 7 dias na lista principal; histórico full na rota separada `/app/obras/[id]/ponto`.

### Imagens
- Resize server-side força foto ≤ 1200px maior lado, JPEG q=82 → tipicamente 100-300KB.
- Grid no painel: `srcset` simples (foto única já é otimizada).
- Lightbox: carrega tamanho original (que já é ≤1200px). Não temos thumbnail separado pra economizar Storage.
- Lazy loading no scroll do diário (`loading="lazy"` + intersection observer pro batch >10).

### Real-time
- **Não usamos** Supabase Realtime nesta fase (foreman e gestor raramente abrem ao mesmo tempo).
- Refresh manual / `router.refresh()` no submit das actions.

---

## 11. Mobile + offline tolerance (sem PWA full)

**Decisão:** **não fazemos** Service Worker / Workbox / IndexedDB nesta fase. Vira complexidade desproporcional vs valor (Fase 1.5).

**O que fazemos no lugar pra resistir a conexão ruim:**

1. **Optimistic UI** em diário/etapa/ponto/custo — UI atualiza imediatamente, ação roda em background, se falhar mostra toast "Não enviou, tenta de novo".
2. **Retry com backoff** em uploads de foto (3 tentativas, 1s/2s/4s).
3. **Upload paralelo** das fotos do diário (até 4 em paralelo); submit do entry só depois que todas confirmadas.
4. **Botão "Postar" desabilitado** enquanto upload tá em andamento — feedback claro.
5. **Geolocation com timeout 5s** — se não pegar, segue sem.
6. **Form fields preservados em sessionStorage** durante a digitação (recover se a aba reload acidentalmente).

Resultado prático: o encarregado postar diário com 4G ruim funciona; se cair zero internet, perde a tela em vez de salvar local. Aceitável pro MVP — encarregado no telhado geralmente tem sinal.

---

## 12. Testes

### Cobertura mínima
- **Unit:** `lib/photos/resize.ts` (input grande → output 1200px), `lib/project-status.ts` transições válidas/inválidas.
- **Integration (Supabase Postgres real):**
  - RLS: usuário de company A não vê stages/diary/costs/time/photos de company B (1 teste por tabela)
  - RPC `insert_diary_entry` rejeita >20 fotos, entry vazia, forbidden cross-tenant
  - RPC `instantiate_template_stages` rejeita template de outra company, popula positions corretamente
  - Trigger `tg_recalc_project_progress` recalcula no insert/update/delete
  - Unique `time_entries_dedup_uq` previne duplicata
- **E2E (Playwright manual ou agent-browser):**
  - Convert orçamento aprovado → obra com etapas instanciadas do template Cobertura nova
  - Marcar 1 etapa como em execução → sugestão pra mudar obra pra `in_progress`
  - Postar entry com 3 fotos (resize + upload)
  - Lançar gasto + ver margem atualizada
  - Bater ponto de 3 peões → totalizar horas do dia
  - Abrir `/q/[token]` em sessão anon → toggle "Andamento" mostra etapas + fotos, **não mostra** custos nem ponto

### Não-testado (debt aceito)
- Concorrência real (2 users editando mesma etapa). Última gravação ganha; baixíssima probabilidade no perfil de uso.

---

## 13. Quebra em PRs

| # | PR | Conteúdo | Estimativa |
|---|----|---------|-----|
| 1 | **Schema + seed** | Migration única com todas as tabelas, triggers, RPCs, seed dos 3 templates de sistema, RLS. Adicionar testes de RLS. | 1.5 dia |
| 2 | **Etapas** | `project_stages` UI completa (lista, add, edit, reorder, status, apply template), atualiza `projects.progress_pct` via trigger. `convertToProject` da Fase 1.2 ganha "qual template?" no modal. | 2.5 dias |
| 3 | **Diário** | Upload pipeline (sharp + API route), composer, entries, lightbox. Bucket Storage. | 3 dias |
| 4 | **Custos** | Form, lista por categoria, cálculo de margem, sugestão de vincular à etapa em execução. | 1.5 dia |
| 5 | **Ponto** | Form, lista do dia, histórico, geolocalização opcional. Autocomplete de worker_name. | 2 dias |
| 6 | **Link público + Status** | Atualizar `/q/[token]` com aba Andamento, signed URL de foto, status manual + sugestões inline, página de templates em settings. | 2.5 dias |

Total: ~13 dias.

**Cada PR deve fechar com:**
- ✅ Tipos TypeScript estritos passando (`pnpm tsc --noEmit`)
- ✅ Lint passando
- ✅ Migration aplicável idempotentemente
- ✅ Smoke test manual no fluxo principal
- ✅ Notas no README do PR sobre `.env.local` se algo mudou (não deve mudar)

---

## 14. Riscos & mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|------|---------|---------|-----------|
| Upload de fotos consome cota Storage rápido | Média | Médio | Hard limit 5MB/foto, 20 fotos/entry, resize agressivo 1200px q=82. Monitorar consumo no Supabase weekly. |
| `sharp` em runtime Vercel custa CPU | Baixa | Médio | Vercel hobby plan permite 100h CPU/mês. Resize é ~200ms por foto. ~1.8M fotos/mês. Suficiente pra começar. Plan B: mover pra Edge Function do Supabase. |
| Trigger de progress_pct fica devagar em projeto com muitas etapas | Muito baixa | Baixo | Projeto típico tem 6-12 etapas. Trigger é O(n) por mudança, n pequeno. Index já existe. |
| Orfanização de fotos no Storage | Média | Baixo | Aceito no MVP. Cron de limpeza vira Fase 1.4. |
| Conflito de simultaneidade no encarregado batendo ponto duplicado | Baixa | Baixo | Unique index previne. Action retorna mensagem amigável. |
| Cliente abrir link público e ver custos por bug de RLS | Baixíssima | Catastrófico | View "Andamento" busca dados via admin client com query explícita SEM custos/ponto. Nunca devolve esses campos. Smoke test dedicado. |
| `share_token` reusado vaza histórico se cliente repassar | Médio | Baixo | Já no design do 1.2 — token é compartilhável por design. Endereço completo escondido. Sem custos/ponto. Aceito. |

---

## 15. Métricas pós-lançamento

Eventos PostHog (quando subir PostHog, ainda não tá no projeto):

- `obra_painel_aberto` (project_id, status, days_since_start)
- `etapa_criada` / `etapa_status_changed` (from, to, via_suggestion?)
- `diario_postado` (n_photos, body_len, time_of_day)
- `custo_lancado` (category, amount_cents_bucket)
- `ponto_batido` (n_workers_today, has_gps)
- `link_publico_acessado_andamento` (project_id, days_since_quote_approved)

Hipótese principal a validar: encarregado consegue postar diário em ≤2 min p95. Se não, simplificar drasticamente.

---

## 16. Decisões tomadas durante o brainstorming (rastreabilidade)

| # | Tema | Decisão | Por quê |
|---|------|---------|---------|
| 1 | Escopo | 6 features de uma vez, não dividir 1.3+1.4 | Pedido do fundador; foco em produto incrível |
| 2 | Etapas — modelo | Lista ordenada com checkbox, não Kanban | Mobile-friendly idêntico web/mobile; padrão Asana/Linear |
| 3 | Etapas — origem | Templates por tipo de obra (3 system + custom) | Onboarding rápido; 90% dos casos cabem no preset |
| 4 | Fotos | Server-side resize via `sharp` no upload | Performance no celular do encarregado; uniformiza |
| 5 | Ponto | Encarregado bate por todos (proxy) | Realidade do campo; peão não tem conta no MVP |
| 6 | Status | Manual com sugestões inline | Encarregado quer controle; sugestão automatiza o caminho feliz |
| 7 | Link público | Reusa `share_token` da Fase 1.2 | Continuidade pro cliente; 0 atrito |
| 8 | Custos | Lançados livres + opcional vincular a etapa | Empreiteiro lança rápido sem ser obrigado a categorizar fino |
| 9 | Offline | Não fazemos Service Worker; usamos optimistic + retry | YAGNI; complexidade desproporcional pra MVP |
| 10 | Margem | `(total_cents - sum(costs)) / total_cents` | Simples, suficiente pro empreiteiro decidir se a obra dá dinheiro |

---

## 17. O que vem depois

**Fase 1.4 candidatos:**
- Materiais & estoque por obra
- Cobrança financeira (Asaas Pix)
- Cron de limpeza de fotos órfãs
- Notificação ao cliente quando há nova foto (Resend)

**Fase 1.5:**
- Offline real com Service Worker + IndexedDB sync queue
- App PWA installable com prompt
- Push notifications

**Fase 2:**
- `employees` real (peão como user com conta própria)
- Aprovação de medição pelo cliente no link público
- Comentários assíncronos cliente↔empreiteiro
- Audit logs imutáveis

---

*Fim do design doc. Próximo passo: invocar writing-plans pra detalhar o passo-a-passo de cada PR.*
