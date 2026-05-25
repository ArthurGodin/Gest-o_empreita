# Fase 1.2 — Módulo de Orçamentos — Design Doc

**Status:** aprovado (brainstorming) · pronto pra plano de implementação
**Autor:** Claude (engenheiro sênior) + Arthur Godinho (fundador)
**Data:** 2026-05-24
**Branch alvo:** `main`

---

## 1. Por que existe

O empreiteiro de cobertura hoje faz orçamento no caderno ou no WhatsApp. Não tem profissionalismo, não tem controle, não tem aprovação digital. O cliente esquece, recusa por desconfiança, ou pede outro.

Esta fase entrega **a parte do produto que vende o produto**: orçamento profissional enviado por link público, aprovado pelo cliente no celular com 1 clique e o nome. É o "uau" do MVP. Quem viu funcionando assina.

**Critério de sucesso:** um empreiteiro consegue, em ≤5 minutos, criar um orçamento, enviar pelo WhatsApp e receber a aprovação digital. A segunda vez que ele usa, o catálogo de itens já economiza ≥30% do tempo de digitação.

---

## 2. Escopo

### Em escopo

- Editor de orçamento responsivo (tabela densa no desktop, cards no mobile — mesmo dado, dois layouts CSS)
- **Catálogo orgânico** de itens reutilizáveis (autocomplete que cresce com o uso, sem o usuário pensar nisso)
- Numeração automática `ORC-{ano}-{seq}` por empresa, sequência reseta a cada ano
- Validade default 15 dias, customizável
- Lista de orçamentos com filtro por status + busca por número/cliente
- **Link público `/q/[token]`** mobile-first com aprovação digital (nome + clique)
- Rejeição com motivo opcional
- Status flow automático: `draft → sent → viewed → approved/rejected/expired`
- **Upload de logo da empresa** (`/app/configuracoes`, Supabase Storage)
- **Geração de PDF** server-side via `@react-pdf/renderer`, cached em Storage
- **Notificação por email** ao empreiteiro via Resend quando cliente aprova/rejeita
- **Conversão orçamento aprovado → obra (`projects`)** com 1 clique

### Fora de escopo (Fase 2+)

- Versionamento de orçamento (orçamento sent é imutável; pra mudar, duplica em novo draft)
- Edição depois de sent
- Categorias por item (Material / MO / Frete) e desconto por linha — desconto é uma linha explícita do orçamento
- Assinatura desenhada em canvas (peso legal extra desnecessário pra coberteiro pequeno)
- Lembretes automáticos (cron de "3 dias antes de expirar" etc.)
- Painel de obra (cria-se a obra no convert, mas o painel é Fase 1.3)

### Estimativa

~7-9 dias de trabalho focado, divisíveis em ~5 PRs incrementais.

---

## 3. Schema (DB)

Migration `supabase/migrations/20260526000001_quotes_module.sql` (idempotente, drop-then-create no padrão de 0002).

### 3.1 Tabela nova — `catalog_items`

Catálogo orgânico de itens por empresa. Cresce com uso.

```sql
create table public.catalog_items (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  description         text not null,
  unit                text not null default 'un',
  default_price_cents bigint not null default 0,
  usage_count         int not null default 0,
  last_used_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Unicidade case-insensitive: não duplica "Telha cerâmica" e "telha cerâmica"
create unique index catalog_items_company_desc_lower_uq
  on public.catalog_items (company_id, lower(description));

-- Index para autocomplete por prefixo (rápido em "Telh...")
create index catalog_items_search_idx
  on public.catalog_items (company_id, last_used_at desc nulls last);

alter table public.catalog_items enable row level security;

-- RLS: tenant-scoped padrão (4 policies: select/insert/update/delete)
-- por company_id in (select public.user_company_ids())
```

### 3.2 Tabela nova — `quote_approvals`

Histórico imutável de aprovações/rejeições. Auditoria.

```sql
create type public.quote_approval_action as enum ('approved', 'rejected');

create table public.quote_approvals (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references public.quotes(id) on delete cascade,
  company_id       uuid not null references public.companies(id) on delete cascade,
  action           public.quote_approval_action not null,
  signer_name      text not null,
  rejection_reason text,
  ip_address       inet,
  user_agent       text,
  created_at       timestamptz not null default now()
);

create index quote_approvals_quote_idx on public.quote_approvals (quote_id);

alter table public.quote_approvals enable row level security;

-- SELECT: tenant-scoped padrão
-- INSERT: NÃO há policy authenticated nem anon — escrita só via admin client
--         (server actions do link público chamam com service role após validar token).
--         Isso impede um anon de chamar PostgREST direto e inserir aprovação fake.
```

### 3.3 Tabela nova — `quote_sequences`

Numeração atômica por empresa por ano (evita race em count).

```sql
create table public.quote_sequences (
  company_id  uuid not null references public.companies(id) on delete cascade,
  year        int  not null,
  last_num    int  not null default 0,
  primary key (company_id, year)
);

alter table public.quote_sequences enable row level security;
-- Sem policies — manipulação só via SECURITY DEFINER function

create or replace function public.next_quote_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from now())::int;
  v_seq  int;
begin
  insert into public.quote_sequences (company_id, year, last_num)
    values (p_company_id, v_year, 1)
    on conflict (company_id, year)
      do update set last_num = quote_sequences.last_num + 1
    returning last_num into v_seq;
  return format('ORC-%s-%s', v_year, lpad(v_seq::text, 4, '0'));
end;
$$;

grant execute on function public.next_quote_number(uuid) to authenticated;
```

Usado pela server action de criar orçamento. Retorno: `ORC-2026-0001`, `ORC-2026-0002`, ..., `ORC-2027-0001`.

### 3.4 Alterações em `quotes`

```sql
alter table public.quotes
  add column if not exists pdf_storage_path     text,
  add column if not exists notification_sent_at timestamptz;

-- Trigger pra gerar share_token automaticamente se não vier preenchido.
-- Usa base64 stripado de +/= pra ficar URL-safe sem necessidade de encoding.
create or replace function public.tg_quotes_ensure_share_token()
returns trigger language plpgsql as $$
begin
  if new.share_token is null then
    new.share_token := translate(encode(gen_random_bytes(32), 'base64'), '+/=', '');
  end if;
  return new;
end;
$$;

create trigger quotes_ensure_share_token
  before insert on public.quotes
  for each row execute function public.tg_quotes_ensure_share_token();
```

Constraint de comprimento ≥32 já existe (migration 0002 hardening). Default cripto idem.

**Nota sobre comprimento após strip:** `gen_random_bytes(24)` em base64 = exatamente 32 chars sem padding (24 é múltiplo de 3). Stripando `+/=`, sobram **≥30 chars** no pior caso (se todos os bytes fossem `+` ou `/`, o que é astronomicamente improvável — ~1 em 10^15 pra 30 chars). Pra garantir, vou usar `gen_random_bytes(32)` que mesmo após strip tem ≥38 chars sempre. Atualizar a função pra usar 32 bytes.

### 3.5 Storage bucket — `company-logos`

```sql
insert into storage.buckets (id, name, public) values ('company-logos', 'company-logos', true)
  on conflict do nothing;

-- Public read (logos aparecem em link público sem auth)
create policy "company-logos public read" on storage.objects for select
  to anon, authenticated using (bucket_id = 'company-logos');

-- Write/delete: SOMENTE service role (server action valida ownership)
-- Não criamos policy authenticated — admin client bypassa RLS pra fazer upload.
```

Path convention: `company-logos/<company_id>.{ext}`.

### 3.6 Storage bucket — `quotes-pdf` (privado)

```sql
insert into storage.buckets (id, name, public) values ('quotes-pdf', 'quotes-pdf', false)
  on conflict do nothing;

-- Sem policy public — acesso só via signed URLs ou admin client server-side.
```

Path: `quotes-pdf/<quote_id>.pdf`. Regenerado quando `quote.updated_at > arquivo`.

---

## 4. Rotas & estrutura de arquivos

```
web/src/
├── lib/
│   ├── queries/
│   │   ├── quotes.ts                 # getQuotes, getQuote, getQuoteWithRelations
│   │   ├── catalog.ts                # getCatalogItems, suggestCatalog(query)
│   │   └── company.ts                # +getCompany (com logo_url)
│   ├── supabase/
│   │   └── storage.ts                # uploadCompanyLogo, getPublicLogoUrl, uploadQuotePdf
│   ├── pdf/
│   │   └── quote-pdf.tsx             # componente @react-pdf/renderer
│   ├── email/
│   │   ├── client.ts                 # Resend instance
│   │   └── templates/quote-approved.tsx
│   ├── quote-token.ts                # gera tokens base64 (24 bytes random)
│   └── quote-status.ts               # state machine helpers
│
├── app/
│   ├── app/
│   │   ├── orcamentos/
│   │   │   ├── page.tsx              # lista com filtro+busca
│   │   │   ├── quote-list.tsx        # client (filtro client-side, busca debounced)
│   │   │   ├── actions.ts            # CRUD + send + duplicate + convertToProject
│   │   │   ├── novo/page.tsx         # form criar (escolhe cliente)
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # editor server component
│   │   │       ├── quote-editor.tsx  # cliente grande (itens + totais)
│   │   │       ├── item-row.tsx      # responsivo tabela/card
│   │   │       ├── item-autocomplete.tsx
│   │   │       ├── send-quote-button.tsx
│   │   │       └── convert-to-project.tsx
│   │   ├── configuracoes/
│   │   │   ├── page.tsx              # form empresa
│   │   │   ├── company-form.tsx
│   │   │   ├── logo-upload.tsx       # drag-drop client component
│   │   │   └── actions.ts
│   │   └── catalogo/
│   │       ├── page.tsx              # lista simples + delete
│   │       └── actions.ts
│   │
│   ├── q/[token]/                    # ⭐ rota pública fora do /app
│   │   ├── page.tsx                  # RSC, sem auth
│   │   ├── approval-form.tsx         # client com Aprovar/Rejeitar
│   │   ├── actions.ts                # approveQuote, rejectQuote (anon, valida token)
│   │   ├── aprovado/page.tsx         # confirmação
│   │   └── pdf/route.ts              # streama PDF (anon, valida token)
│   │
│   └── api/
│       └── quotes/[id]/pdf/route.ts  # PDF autenticado
│
└── middleware.ts                     # adiciona /q/* em PUBLIC_PATHS
```

### Sidebar / nav update

- Adicionar link **Catálogo** entre **Clientes** e **Financeiro**
- Adicionar **Configurações** já existe no rodapé — ligar ao `/app/configuracoes` que será criado

---

## 5. State machine — Status do orçamento

```
              ┌───────────┐                       ┌──────────┐
              │   draft   │                       │ expired  │
              │ (editável)│                       │ (read-only)│
              └─────┬─────┘                       └──────────┘
        action: send │                                  ↑
                    ↓                                  │ derived:
              ┌───────────┐                            │ valid_until < now()
              │   sent    │────► viewed_at = first──┐  │ (calculated, no row update)
              │ (read-only)│      access on /q/...  │  │
              └─────┬─────┘                         │  │
                    │                               ↓  │
                    │                          ┌─────────┐
                    └──── customer action ───►│ viewed  │
                                              └────┬────┘
                                                   │
                                  ┌────────────────┼────────────────┐
                                  ↓                ↓                ↓
                          ┌──────────────┐  ┌──────────────┐  ┌──────────┐
                          │   approved   │  │   rejected   │  │ (expired)│
                          └──────┬───────┘  └──────────────┘  └──────────┘
                                 │
                                 ↓
                          convertToProject
                          (projects row created)
```

Implementação:
- Coluna `status` é fonte de verdade pra `draft|sent|viewed|approved|rejected`
- `expired` é **derivado** em query: `case when status = 'sent' and valid_until < current_date then 'expired' else status end as effective_status` — não precisamos cron pra MVP
- Transições só via server actions, validadas:
  - `draft → sent`: gera share_token (trigger), seta `sent_at`, deixa editável só por owner em casos especiais (Fase 2)
  - `sent → viewed`: server action `recordView` no `/q/[token]/page.tsx`, idempotente (set viewed_at se null)
  - `sent|viewed → approved|rejected`: server action no link público, exige nome do cliente, grava `quote_approvals`
  - `*` (qualquer) → duplicate: cria novo draft com itens copiados

---

## 6. Funcionalidades-chave

### 6.1 Catálogo orgânico

**Princípio:** o catálogo não pede pra ser usado. Ele oferece.

Fluxo:
1. Empreiteiro digita "Telha cerâmica" no campo `description` da linha do item
2. **Sem catálogo ainda:** preenche normal, salva orçamento. Botão sutil 💾 aparece ao lado da linha após salvar — "Salvar no catálogo". Click → upsert em `catalog_items`.
3. **Próximo orçamento:** digita "Telh..." → após 2 chars + debounce 200ms, dropdown com até 5 sugestões (`order by usage_count desc, last_used_at desc`).
4. Click numa sugestão → preenche `description`, `unit`, `unit_price_cents` da linha. Server action incrementa `usage_count`, atualiza `last_used_at`.
5. Página `/app/catalogo` é lista simples com search + delete (raramente acessada — autocomplete cobre 95%).

**Edge case:** se descrição digitada bate **exatamente** com item do catálogo mas com preço diferente, não auto-atualiza (respeita override do empreiteiro). Mostra hint discreto "Preço diferente do catálogo (R$ X) — atualizar catálogo? [Sim]".

### 6.2 Editor responsivo híbrido

Componente único `<ItemRow item={...} onChange={...} onRemove={...} />` que renderiza por CSS:

**Desktop ≥ 768px** (Tailwind `md:`):
```
[Descrição (autocomplete)    ] [Qtd ] [Un ] [R$    ] [Total ] [≡]
```
Grid: `grid-cols-[1fr_60px_60px_90px_90px_auto]`, align center, gap-2.

**Mobile < 768px:**
```
┌─────────────────────────────┐
│ Descrição (autocomplete)    │
│ Qtd × Un  @ R$ ____         │
│                  Total: R$  │
│                     [💾] [×]│
└─────────────────────────────┘
```
Stack vertical, cada campo com `<label>` próprio. Grupo qtd/un em uma linha, preço em outra.

Estado: `useState<ItemDraft[]>` no `<QuoteEditor />` pai. Total = `useMemo(() => items.reduce(...))`. Renderização: instantânea conforme digita.

Drag-to-reorder: `@dnd-kit/core` (~5KB, touch-friendly). Reorder atualiza state local, position vai no DB no submit.

### 6.3 Página pública `/q/[token]`

Server Component, **fora** do `(app)` route group, sem middleware de auth.

```tsx
// /q/[token]/page.tsx
export default async function PublicQuotePage({ params }) {
  const admin = createAdminClient();
  const quote = await admin.from("quotes")
    .select("*, company:companies(name, logo_url, phone, email), customer:customers(name, city, state), items:quote_items(*)")
    .eq("share_token", params.token)
    .maybeSingle();

  if (!quote.data) notFound();

  // Marca como viewed na primeira vez (idempotente)
  if (quote.data.status === "sent") {
    await admin.from("quotes").update({
      status: "viewed",
      viewed_at: new Date().toISOString(),
    }).eq("id", quote.data.id).is("viewed_at", null);
  }

  const isExpired = quote.data.valid_until && new Date(quote.data.valid_until) < new Date();
  const effectiveStatus = isExpired ? "expired" : quote.data.status;

  return <PublicQuoteView quote={quote.data} status={effectiveStatus} />;
}
```

Visual: phone-frame-style mobile-first com logo da empresa no topo, header do orçamento, validade com countdown, itens em cards (não tabela — cliente lê numa coluna), total grande em laranja, observações, `<ApprovalForm />` no rodapé.

**Estados visuais:**
- `sent` / `viewed`: form de aprovação ativo
- `approved`: banner verde "Aprovado por NOME em DD/MM/YYYY HH:MM" + botão "Baixar PDF"
- `rejected`: banner cinza "Você marcou como Pedir mudanças em DD/MM" + texto neutro
- `expired`: banner amarelo "Este orçamento expirou em DD/MM. Solicite um novo ao empreiteiro." sem ações

### 6.4 Aprovação digital

Server action `approveQuoteAction(token, name)`:
1. Valida `name.length >= 2`
2. Admin client busca quote por token
3. Verifica status atual (deve ser `sent` ou `viewed`)
4. Verifica `valid_until >= today`
5. Transação:
   - Update quote: `status='approved', approved_at=now()`
   - Insert `quote_approvals`: action='approved', signer_name, ip_address, user_agent
6. Dispara email Resend (best-effort, não falha a aprovação)
7. Retorna `{ok: true}` → client redireciona pra `/q/[token]/aprovado`

`rejectQuoteAction(token, name, reason?)` é simétrico.

IP capturado do request header (`x-forwarded-for` ou `request.ip` no edge runtime). User-agent do `headers().get('user-agent')`.

### 6.5 PDF generation (`@react-pdf/renderer`)

Componente `<QuotePdf company customer quote items />` em `lib/pdf/quote-pdf.tsx`. Layout aproximado:
- Header: logo (esquerda) + dados da empresa (direita)
- Título: "Orçamento ORC-2026-0001"
- Bloco "Para:" com dados do cliente
- Tabela de itens
- Total em destaque
- Observações
- Footer com validade e dados de contato

Server action `generateQuotePdf(quoteId)`:
1. Carrega quote + company + customer + items
2. Lê logo do Storage se houver
3. `renderToBuffer(<QuotePdf ... />)`
4. Upload pro Storage bucket `quotes-pdf/<id>.pdf`
5. Update `quotes.pdf_storage_path`

Route handlers:
- `/api/quotes/[id]/pdf` (auth): server-side fetch from Storage, retorna stream
- `/q/[token]/pdf` (anon, valida token): mesmo

Invalidação: se `quote.updated_at > pdf gerado` (mtime do Storage), regenera antes de servir.

### 6.6 Conversão orçamento → obra

Botão "Virar obra" no editor, visível só se `status='approved'` e `project_id is null`.

Server action `convertToProjectAction(quoteId)`:
```sql
insert into projects (company_id, customer_id, name, address, budget_cents, status, starts_on)
values (
  $1, -- company_id (do quote)
  $2, -- customer_id (do quote)
  $3, -- name = quote.title
  $4, -- address = customer.address
  $5, -- budget_cents = quote.total_cents
  'planning',
  current_date
)
returning id;

update quotes set project_id = $new_project_id where id = $quote_id;
```

Redirect pra `/app/obras/[id]` (placeholder por enquanto: "Obra criada, painel completo vem na Fase 1.3").

---

## 7. Pontas soltas

### 7.1 Upload de logo

Página `/app/configuracoes`:
- Form com dados da empresa (nome, telefone, email, endereço, cidade, UF, CEP, CNPJ, legal_name)
- Zona de drop pra logo: dropzone com preview, limite 2MB, formatos PNG/JPG/WEBP

Server action `uploadCompanyLogoAction(formData)`:
1. Auth + active company
2. Valida arquivo (size, mime)
3. Resize server-side com `sharp` pra 256×256 max (fit: contain, background transparent)
4. Upload via admin client pro bucket `company-logos/<company_id>.png`
5. Update `companies.logo_url` com public URL do Storage

Nudge no dashboard: card "Adicione sua logo pro orçamento parecer profissional" se `logo_url is null`. Dismissible.

### 7.2 Notificações

`lib/email/client.ts`:
```ts
import { Resend } from "resend";
export const resend = new Resend(serverEnv.RESEND_API_KEY);
```

`lib/email/templates/quote-approved.tsx`: componente React.

Em `approveQuoteAction`, após salvar:
```ts
if (!quote.notification_sent_at) {
  try {
    await resend.emails.send({
      from: "Gestão Empreita <onboarding@resend.dev>",
      to: ownerEmail, // from company_members + auth.users
      subject: `✓ ${customerName} aprovou o orçamento ${quote.number}`,
      react: <QuoteApprovedEmail ... />,
    });
    await admin.from("quotes").update({ notification_sent_at: new Date() }).eq("id", quote.id);
  } catch (e) {
    logServerError("notification.quote-approved", e);
  }
}
```

Sem domínio próprio em produção (Fase 1.2): `onboarding@resend.dev` (default permitido). Fase 2: configurar `noreply@empreita.app` com DNS no Resend.

`RESEND_API_KEY` no `env-server.ts` (server-only, required).

### 7.3 Token security

`lib/quote-token.ts`:
```ts
import { randomBytes } from "node:crypto";
export function generateShareToken(): string {
  // 32 bytes = 256 bits de entropia. Após strip de +/= sobram ≥38 chars sempre.
  return randomBytes(32).toString("base64").replace(/[+/=]/g, "");
}
```

Geração no trigger DB também (defesa em profundidade). Validação: nada de comparação por substring — sempre `=` exato no SQL.

Rotação: empreiteiro pode clicar "Reenviar link" no editor → server action gera novo token, invalida anterior. (Implementação Fase 1.2 — funcionalidade simples.)

### 7.4 Edge cases (referência rápida)

| Caso | Comportamento |
|---|---|
| Token inexistente | `notFound()` (página 404 amigável "Esse link não é válido ou já expirou") |
| Quote em status `draft` acessado via link | 404 — só se torna público após `send` |
| Quote expirado clicado pra aprovar | Server action recusa com "Orçamento expirou, peça um novo" |
| Quote já aprovado clicado pra aprovar de novo | Idempotente, mostra "Já aprovado em DD/MM por NOME" |
| Empreiteiro edita quote já `sent` | Bloqueado server-side. UI: read-only + banner "Pra mudar, duplique" |
| PDF generation falha | Try/catch, fallback HTML printable (`window.print()` no detail page) |
| Email send falha | Loga, segue. Empreiteiro tem badge no dashboard "1 novo orçamento aprovado" |
| Race na numeração | `quote_sequences` com on conflict do update — atômico |
| Logo corrompido / falha de upload | Continua sem logo, placeholder genérico no link público |

### 7.5 Testes

**E2E com agent-browser:**
1. Login → /app/orcamentos → vazio
2. Criar orçamento, escolher cliente Maria
3. Adicionar 3 itens (Telha, Manta, Mão de obra) com valores
4. Salvar 1 deles no catálogo (📊)
5. Voltar e criar SEGUNDO orçamento
6. Digitar "Telh..." no item → ver autocomplete sugerir
7. Click no sugerido → ver preencher os 3 campos
8. Enviar primeiro orçamento → ver share_token gerado
9. Abrir `/q/[token]` em browser separado (anon) → ver layout mobile
10. Digitar nome + Aprovar → ver redirect `/q/[token]/aprovado`
11. Voltar como empreiteiro → ver status approved + signer no dashboard
12. Click "Virar obra" → ver projects row criada

**Unit (vitest):**
- Token generator: gera 1000 tokens, verifica que todos têm ≥32 chars e são distintos
- State machine: testa transições válidas/inválidas em matriz
- Catalog dedup: insert "Telha cerâmica" + "telha cerâmica" → vira mesma row
- `next_quote_number` ano-turn: simula `now()` em 31/dez 23:59 e 01/jan 00:01 → sequência reseta

**Verify visual:**
- Link público em viewport 390x844 (iPhone) + 1280x800 (desktop)
- Dark mode (preferência do sistema) — sem regressão
- PDF gerado abre limpo em navegador e tem layout legível

### 7.6 Performance

- **Lista de orçamentos**: cursor pagination (`order by created_at desc, id desc limit 20`) — escala a 10k+ orçamentos sem deteriorar
- **Catálogo autocomplete**: index `(company_id, lower(description))` + LIMIT 5 — sub-50ms mesmo com 10k itens por empresa
- **PDF**: cacheado em Storage, regenera só se quote mudou. Cliente típico baixa ≥1 vez

### 7.7 Acessibilidade (link público)

Esse é o ponto de contato com leigos — preciso ser rigoroso:
- Contraste mínimo 4.5:1 (WCAG AA) em todo texto
- Tamanho mínimo de texto 14px (16px ideal — empreiteiro de meia-idade vê)
- Tap targets ≥44×44px nos botões Aprovar/Rejeitar
- `<label>` explícito no campo de nome
- ARIA labels nos botões de ação
- Foco visível em qualquer elemento focusable
- Sem dependência de JS pra ler o orçamento (Server Component renderiza tudo HTML)

---

## 8. Configuração & operação

### Env vars novas

```
RESEND_API_KEY=re_xxx                                  # server-only, required em prod
```

Validado em `env-server.ts`. Em dev, opcional — sem email não quebra app, só loga.

### Buckets a criar no Supabase (manual via SQL editor)

- `company-logos` (público)
- `quotes-pdf` (privado)

Migration cria via `insert into storage.buckets`.

### Domínio Resend

Fase 1.2: usa `onboarding@resend.dev` (default sem domínio).
Fase 2: configura `noreply@empreita.app` (precisa de domínio próprio — gasto fora do free tier).

---

## 9. Migration de rollout

Para a migração de banco entrar em produção, o empreiteiro precisa:

1. Cole `supabase/migrations/20260526000001_quotes_module.sql` no SQL Editor → Run.
2. Verifica que rodou sem erro.
3. Pull do novo código + `npm install` (novas deps: `@react-pdf/renderer`, `@dnd-kit/core`, `resend`, `sharp`).
4. Atualiza `.env.local` com `RESEND_API_KEY` (gera grátis em resend.com).
5. Reinicia dev server.

Sem breaking changes em features já existentes (clientes, onboarding, dashboard).

---

## 10. Anti-objetivos (decisões deliberadas de NÃO fazer)

- **NÃO** vamos fazer editor WYSIWYG com formatação rica em descrição/observações. Textarea simples.
- **NÃO** vamos suportar múltiplas moedas. Centavos em BRL.
- **NÃO** vamos calcular impostos. Empreiteiro pequeno trabalha "ao todo" — sem ICMS na nota.
- **NÃO** vamos permitir orçamento sem cliente cadastrado. Cliente é entidade obrigatória (já força bom hábito de cadastro).
- **NÃO** vamos enviar email de "viewed" pro empreiteiro a cada acesso. Só aprovação/rejeição. (Future: badge no dashboard "Maria viu seu orçamento há 2h").

---

## 11. Métricas de sucesso (pós-lançamento)

Vou pedir ao founder pra observar nos primeiros 5 clientes que recebem o produto:

1. **Time-to-first-quote**: tempo desde signup até primeiro orçamento criado. Alvo: <10min.
2. **Quote acceptance rate**: % de orçamentos com link público que chegam a `approved`. Alvo: >40%.
3. **Catalog reuse**: % de linhas de orçamento que vieram do autocomplete (não digitadas). Alvo: >30% no terceiro orçamento da empresa.
4. **Time on quote**: tempo entre `created_at` e `sent_at`. Alvo: <8min para o primeiro, <4min do quinto em diante.

Não vamos instrumentar PostHog na Fase 1.2 (custo de complexidade). Empreiteiros vão me reportar manualmente. Fase 2 traz analytics.

---

*Fim do design doc.*
