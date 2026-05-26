# Fase 1.4 — Cobrança Pix (Asaas) — Design Doc

**Status:** aprovado (brainstorming) · pronto pra plano de implementação
**Autor:** Claude (engenheiro sênior) + Arthur Godinho (fundador)
**Data:** 2026-05-25
**Branch alvo:** `main`
**Pré-requisitos:** Fase 1.2 (orçamentos) + Fase 1.3 (painel da obra) em produção

---

## 1. Por que existe

A Fase 1.2 vendeu o produto (orçamento aprovado por link). A Fase 1.3 prendeu o cliente no produto (painel da obra). **A Fase 1.4 faz o produto faturar:** o empreiteiro cobra o cliente direto pelo sistema, via Pix, sem trocar mensagem nem mandar PIX no WhatsApp.

Hoje, o ciclo financeiro fora do produto causa três dores:
1. Empreiteiro esquece de cobrar o saldo → atraso no recebimento
2. Cliente esquece o que combinaram (entrada vs saldo) → fricção e desconfiança
3. Falta de comprovante centralizado → "paguei tudo!" "não recebi"

**Critério de sucesso:**
1. Empreiteiro consegue, em ≤1 minuto após cliente aprovar orçamento, criar uma obra com cobrança automática (entrada agora + saldo na entrega).
2. Cliente recebe email/SMS do Asaas com link Pix e paga sem precisar abrir WhatsApp.
3. Quando cliente paga, painel da obra reflete em ≤30s via webhook.
4. Quando obra fica `completed`, cliente aprova entrega no `/q/[token]` e libera 2ª cobrança automaticamente — sem o empreiteiro ter que pedir.

---

## 2. Escopo

### Em escopo

1. **Modelo entrada + saldo na entrega** (default 30% entrada, ajustável 0-100% pelo empreiteiro quando vira obra; 0% = só saldo no fim, 100% = só entrada)
2. **Cliente Asaas auto-criado** no momento de virar obra; se cliente do nosso DB não tem CPF/CNPJ, modal pede antes de criar Pix
3. **2 cobranças Pix** geradas pelo Asaas: entrada vence em 7 dias; saldo fica `pending` sem data até cliente aprovar entrega
4. **Webhook `/api/asaas/webhook`** com auth token compartilhado + idempotência (dedupe por `payment_id`); processa eventos `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`
5. **Painel da obra**: nova seção "Cobrança" com cards das 2 parcelas, status (pendente/pago/atrasado), valor, links pix/QR
6. **Link público (`/q/[token]`)**: nova aba "Cobrança" com cards das parcelas pro cliente pagar; banner "Confirme a entrega" quando obra=completed
7. **Aprovação de entrega**: action `approveDeliveryAction` no link público, anon com token, libera 2ª cobrança (chama Asaas pra criar Pix)
8. **Página `/app/financeiro`** (hoje placeholder): lista de cobranças de todas as obras, filtro por status, total pago/pendente do mês
9. **Margem do painel ganha custos vs receita PAGA** (não só faturada): mostra "% recebido" ao lado da margem
10. **Asaas envia notificações** (email + SMS via conta do empreiteiro) — sem Twilio/Resend nosso

### Fora de escopo (Fase 1.5+)

- **Parcelamento em N parcelas** (3x, 6x, 12x) — só entrada + saldo no MVP
- **Boleto** — só Pix por enquanto (cobrança Asaas pode ter os 2, mas UI só expõe Pix)
- **Cartão de crédito (Stripe)** — Fase 2 quando entrar plataforma B2C
- **Reembolso/estorno** — manual via dashboard Asaas; sem UI no nosso lado
- **Subaccount por empreiteiro** (split payment) — Fase 2; por ora ASAAS_API_KEY única (do fundador)
- **Recibos PDF formais** — Asaas já gera o comprovante; sem segunda geração
- **Lembretes de cobrança vencida** automatizados via cron — Asaas faz isso embutido
- **Multi-moeda** — só BRL
- **Negociação de % de entrada com o cliente** (cliente sugere ajuste) — empreiteiro define unilateral
- **Vincular custos pagos a parcelas recebidas** (cash flow) — Fase 2

### Estimativa

~6-8 dias divisíveis em **~4 PRs incrementais**.

---

## 3. Schema (DB)

Migration única `supabase/migrations/20260529000001_billing_asaas.sql` (idempotente).

### 3.1 Tabela nova — `customer_billing_profiles`

Vincula cliente do nosso DB ao Asaas Customer (1-1). Reutilizado entre obras do mesmo cliente.

```sql
create table public.customer_billing_profiles (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references public.customers(id) on delete cascade,
  company_id         uuid not null references public.companies(id) on delete cascade,
  asaas_customer_id  text not null,
  cpf_cnpj           text not null,   -- usado pra criar Asaas Customer, mantido pra audit
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint cbp_cpf_cnpj_len_chk check (char_length(cpf_cnpj) between 11 and 14),
  constraint cbp_asaas_id_len_chk check (char_length(asaas_customer_id) between 1 and 100)
);

-- 1 cliente do nosso DB = 1 Asaas Customer (por tenant)
create unique index customer_billing_profiles_customer_uq
  on public.customer_billing_profiles (customer_id);

create unique index customer_billing_profiles_asaas_uq
  on public.customer_billing_profiles (company_id, asaas_customer_id);

alter table public.customer_billing_profiles enable row level security;
-- 4 policies tenant-scoped padrão
```

### 3.2 Tabela nova — `billing_charges`

Cobranças (entrada + saldo). 2 rows por obra no caso default.

```sql
create type public.charge_kind   as enum ('entrada', 'saldo');
create type public.charge_status as enum (
  'draft',         -- modelo local, ainda não criado no Asaas (raro/curto)
  'pending',       -- criado no Asaas, esperando pagamento
  'overdue',       -- vencido sem pagamento
  'received',      -- pago (webhook PAYMENT_RECEIVED)
  'confirmed',     -- pago e confirmado (webhook PAYMENT_CONFIRMED — Pix instantâneo)
  'cancelled'      -- cancelado/deletado
);

create table public.billing_charges (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  company_id          uuid not null references public.companies(id) on delete cascade,
  customer_id         uuid not null references public.customers(id) on delete restrict,
  kind                public.charge_kind not null,
  status              public.charge_status not null default 'draft',
  amount_cents        bigint not null,
  asaas_payment_id    text,                                    -- preenchido após criar no Asaas
  pix_qr_code         text,                                    -- payload Pix (copia-cola) cacheado
  pix_qr_image_b64    text,                                    -- imagem QR base64 cacheada
  invoice_url         text,                                    -- URL Asaas pública (fallback)
  due_date            date,                                    -- entrada: hoje+7; saldo: null até cliente liberar
  paid_at             timestamptz,                             -- webhook RECEIVED/CONFIRMED
  released_at         timestamptz,                             -- saldo: quando cliente aprovou entrega
  released_by_token   text,                                    -- token usado pra liberar (audit; null se manual)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint billing_amount_chk     check (amount_cents between 1 and 1000000000),
  constraint billing_qr_len_chk     check (pix_qr_code is null or char_length(pix_qr_code) <= 2000),
  constraint billing_invoice_url_chk check (invoice_url is null or char_length(invoice_url) <= 500)
);

create index billing_charges_project_idx on public.billing_charges (project_id, kind);
create index billing_charges_company_idx on public.billing_charges (company_id, status);
create unique index billing_charges_asaas_payment_uq
  on public.billing_charges (company_id, asaas_payment_id)
  where asaas_payment_id is not null;

-- Garante apenas 1 entrada e 1 saldo por obra (versão simples; quando vier
-- parcelamento, troca pra `position int + unique (project_id, kind, position)`)
create unique index billing_charges_one_per_kind_uq
  on public.billing_charges (project_id, kind);

drop trigger if exists billing_charges_set_updated_at on public.billing_charges;
create trigger billing_charges_set_updated_at
  before update on public.billing_charges
  for each row execute function public.tg_set_updated_at();

alter table public.billing_charges enable row level security;
-- 4 policies tenant-scoped padrão
```

### 3.3 Tabela nova — `billing_webhook_events`

Imutabilidade + idempotência do webhook do Asaas.

```sql
create table public.billing_webhook_events (
  id              uuid primary key default gen_random_uuid(),
  asaas_event_id  text not null,
  event_type      text not null,
  asaas_payment_id text,
  raw_payload     jsonb not null,
  processed_at    timestamptz,
  processing_error text,
  created_at      timestamptz not null default now()
);

-- Idempotência: o mesmo event_id nunca processa duas vezes
create unique index billing_webhook_events_event_uq
  on public.billing_webhook_events (asaas_event_id);

create index billing_webhook_events_payment_idx
  on public.billing_webhook_events (asaas_payment_id);

alter table public.billing_webhook_events enable row level security;
-- Sem policies authenticated nem anon — só admin client server-side acessa
```

### 3.4 Alterações em `projects`

```sql
alter table public.projects
  add column if not exists entry_pct          numeric(5,2),                -- % entrada escolhido (ex: 30.00)
  add column if not exists delivery_approved_at  timestamptz,              -- quando cliente aprovou entrega
  add column if not exists delivery_approved_token text;                   -- token usado (audit)

-- Constraint: 0 <= entry_pct <= 100
alter table public.projects
  drop constraint if exists projects_entry_pct_chk;
alter table public.projects
  add constraint projects_entry_pct_chk
  check (entry_pct is null or (entry_pct >= 0 and entry_pct <= 100));
```

### 3.5 RPC — `create_billing_charges_for_project`

Atômico: cria 2 rows `draft` (entrada+saldo) com valores. Não chama Asaas (server action faz isso depois e atualiza com asaas_payment_id).

```sql
create or replace function public.create_billing_charges_for_project(
  p_project_id   uuid,
  p_company_id   uuid,
  p_customer_id  uuid,
  p_entry_pct    numeric,
  p_total_cents  bigint,
  p_due_date     date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_cents bigint;
  v_saldo_cents bigint;
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

  if p_entry_pct < 0 or p_entry_pct > 100 then
    raise exception 'entry_pct out of range' using errcode = '22023';
  end if;

  v_entry_cents := round(p_total_cents * p_entry_pct / 100)::bigint;
  v_saldo_cents := p_total_cents - v_entry_cents;

  -- Cria SÓ se ainda não existir (idempotente em re-call).
  -- Pula cobrança com amount=0 (entry_pct=0 ou =100): no degenerate case
  -- "à vista 100%" só existe entrada; "sem entrada" só existe saldo.
  if v_entry_cents > 0 then
    insert into public.billing_charges
      (project_id, company_id, customer_id, kind, amount_cents, due_date, status)
    values
      (p_project_id, p_company_id, p_customer_id, 'entrada', v_entry_cents, p_due_date, 'draft')
    on conflict (project_id, kind) do nothing;
  end if;

  if v_saldo_cents > 0 then
    insert into public.billing_charges
      (project_id, company_id, customer_id, kind, amount_cents, due_date, status)
    values
      (p_project_id, p_company_id, p_customer_id, 'saldo', v_saldo_cents, null, 'draft')
    on conflict (project_id, kind) do nothing;
  end if;

  update public.projects set entry_pct = p_entry_pct where id = p_project_id;
end;
$$;

grant execute on function public.create_billing_charges_for_project(uuid,uuid,uuid,numeric,bigint,date) to authenticated;
```

### 3.6 Nada de bucket novo

Asaas hospeda o PDF/QR; nós só guardamos o `invoice_url` e o payload Pix.

---

## 4. Rotas & estrutura de arquivos

```
web/src/
├── lib/
│   ├── asaas/
│   │   ├── client.ts             # fetch wrapper c/ ASAAS_API_KEY + base URL (sandbox/prod via env)
│   │   ├── customers.ts          # createCustomer({name, cpfCnpj, email, mobilePhone})
│   │   ├── payments.ts           # createPixPayment({customer, value, dueDate, description, externalReference})
│   │   ├── webhook-verify.ts     # validateAsaasAccessToken(req)
│   │   └── types.ts              # tipos compartilhados
│   ├── queries/
│   │   └── billing.ts            # getProjectCharges, getCompanyBilling (financeiro), getReceivedTotal
│   └── env-server.ts             # +ASAAS_API_KEY, +ASAAS_ENV ('sandbox'|'production'), +ASAAS_WEBHOOK_TOKEN
│
├── app/
│   ├── app/
│   │   ├── obras/[id]/
│   │   │   ├── billing-section.tsx       # client component
│   │   │   ├── charge-card.tsx           # card por parcela (entrada/saldo)
│   │   │   └── actions.ts                # +regenerateChargeAction, +cancelChargeAction
│   │   ├── orcamentos/[id]/
│   │   │   ├── convert-to-project.tsx    # ⭐ ATUALIZAR: modal ganha % entrada + CPF se faltar
│   │   │   └── ... (sem mudanças no resto)
│   │   ├── orcamentos/
│   │   │   └── actions.ts                # ⭐ convertToProjectAction integra criação de cobranças
│   │   ├── financeiro/
│   │   │   ├── page.tsx                  # ⭐ NOVA — lista todas cobranças, filtro, totais
│   │   │   └── billing-list.tsx          # client (filtro + busca)
│   │   └── clientes/
│   │       └── [id]/ (sem mudança — CPF/CNPJ continua opcional no cadastro normal)
│   │
│   ├── q/[token]/
│   │   ├── billing-view.tsx              # ⭐ NOVA tab "Cobrança" no toggle
│   │   ├── delivery-approval.tsx         # ⭐ NOVO banner "Confirme a entrega"
│   │   ├── actions.ts                    # +approveDeliveryAction (anon, valida token)
│   │   └── ... (sem outras mudanças)
│   │
│   └── api/
│       ├── asaas/
│       │   └── webhook/route.ts          # ⭐ POST handler, auth via header token, processa events
│       └── ... (existentes intactos)
│
└── middleware.ts                         # /api/asaas/webhook já é pública (não é /app/*)
```

### Sidebar / nav

- Item "Financeiro" já existe (placeholder hoje); vai virar `/app/financeiro` real.
- Bottom nav mobile: "Financeiro" já está visível.

---

## 5. State machine — Cobrança

```
            ┌─────────┐
            │  draft  │  (row criado pela RPC, ainda sem Asaas payment_id)
            └────┬────┘
                 │ action: createAsaasPayment
                 ▼
            ┌─────────┐
            │ pending │ (criado no Asaas, esperando pagamento)
            └────┬────┘
        ┌────────┼─────────┬──────────────┐
        ▼        ▼         ▼              ▼
    ┌────────┐ ┌──────────┐ ┌──────────┐  ┌──────────┐
    │received│ │confirmed │ │ overdue  │  │cancelled │
    │  (Pix  │ │ (Pix     │ │ (após    │  │ (deletado│
    │ recebi-│ │  instantâ│ │  due_date│  │ manual ou│
    │  do mas│ │  neo OK) │ │ sem pag) │  │ pelo emp │
    │ aguarda│ └──────────┘ └────┬─────┘  │reiteiro) │
    │compens.│        ▲          │        └──────────┘
    └───┬────┘        │          ▼ pagar
        │             │      ┌──────────┐
        └─────────────┘      │ received │ ...
         confirmação            ...
         (Pix usual: vai
          direto pra confirmed)
```

**Regras chave:**
- Saldo só sai de `draft` → `pending` quando cliente aprova entrega no link público (libera explicitamente). Antes disso fica `draft` com `due_date = null`.
- Após webhook receber `PAYMENT_CONFIRMED`, o status local fica `confirmed` independente do que estava antes (terminal).
- `overdue` → `received/confirmed` é válido (cliente paga atrasado).
- Empreiteiro pode `cancelChargeAction` somente se status `draft` ou `pending`. Cancela no Asaas + marca local.
- Idempotência do webhook garante que reprocessar o mesmo evento não muda estado.

---

## 6. State machine — Aprovação de entrega

```
       (obra=in_progress + saldo em draft)
              │
              ▼ empreiteiro marca obra como completed
       (obra=completed + saldo ainda draft, due_date null)
              │
              ▼ cliente abre /q/[token] e clica "Confirmar entrega"
       projects.delivery_approved_at = now()
       billing_charges (saldo).status = pending
       billing_charges (saldo).due_date = today + 7
       chama Asaas pra criar Pix
              │
              ▼
       (saldo agora cobrável; cliente paga no mesmo link)
```

**Variação:** se o empreiteiro voltar a obra pra `in_progress` depois de aprovado (não deveria, mas pode), o saldo NÃO é re-revertido — fica cobrado. Cliente já liberou.

---

## 7. Fluxo de criação de cobrança (convertToProject)

```ts
// Pseudocode da action atualizada
convertToProjectAction(quoteId, { templateId, entryPct }) {
  validate session + company
  validate quote.status === 'approved'

  // 1. Verifica cliente tem CPF
  const customer = await getCustomer(quote.customer_id)
  if (!customer.document) {
    // UI exibiu input de CPF no modal; recebe via param patch
    await updateCustomerDocument(customer.id, payload.cpfCnpj)
  }

  // 2. Cria/recupera Asaas Customer (cache em customer_billing_profiles)
  let billingProfile = await getBillingProfile(customer.id)
  if (!billingProfile) {
    const asaasCustomer = await asaas.createCustomer({
      name: customer.name,
      cpfCnpj: customer.document,
      email: customer.email,
      mobilePhone: customer.phone
    })
    billingProfile = await insertBillingProfile({
      customer_id: customer.id,
      company_id: company.id,
      asaas_customer_id: asaasCustomer.id,
      cpf_cnpj: customer.document
    })
  }

  // 3. Cria project (lógica existente)
  const project = await createProject(...)

  // 4. (Opcional) Aplica template (lógica existente)
  if (templateId) await instantiateTemplate(...)

  // 5. NOVO — Cria as 2 cobranças localmente em draft
  await rpc('create_billing_charges_for_project', {
    p_project_id: project.id,
    p_company_id: company.id,
    p_customer_id: customer.id,
    p_entry_pct: entryPct,
    p_total_cents: quote.total_cents,
    p_due_date: addDaysBR(7)
  })

  // 6. Cria Pix de entrada no Asaas (saldo fica em draft até liberação)
  const entradaCharge = await getEntradaCharge(project.id)
  if (entradaCharge.amount_cents > 0) {
    const asaasPayment = await asaas.createPixPayment({
      customer: billingProfile.asaas_customer_id,
      billingType: 'PIX',
      value: entradaCharge.amount_cents / 100,
      dueDate: addDaysBR(7),
      description: `Entrada - Obra ${project.name}`,
      externalReference: entradaCharge.id, // pra dedupe no webhook
    })
    const pixQr = await asaas.getPixQrCode(asaasPayment.id)

    await updateBillingCharge(entradaCharge.id, {
      asaas_payment_id: asaasPayment.id,
      pix_qr_code: pixQr.payload,
      pix_qr_image_b64: pixQr.encodedImage,
      invoice_url: asaasPayment.invoiceUrl,
      status: 'pending'
    })
  }

  // 7. Link quote → project, revalidate paths
  ...
}
```

**Trade-off:** se a chamada Asaas falhar entre passo 5 e 6, o row local fica em `draft` órfão. UI tem botão "Tentar de novo" pra reexecutar a criação do Pix.

---

## 8. Webhook handler — `/api/asaas/webhook`

```ts
POST /api/asaas/webhook
Headers: { 'asaas-access-token': <secret> }
Body: { id, event, payment: { id, status, value, ... } }
```

Fluxo:

1. **Verificar token** — comparação constant-time entre header `asaas-access-token` e `process.env.ASAAS_WEBHOOK_TOKEN`. Se não bate, 401.
2. **Idempotência** — `INSERT INTO billing_webhook_events (asaas_event_id, ...) ON CONFLICT DO NOTHING`. Se 0 rows afetadas, evento já foi processado, retorna 200 sem fazer nada.
3. **Resolver charge local** — busca `billing_charges WHERE asaas_payment_id = payment.id`.
   - Se não achar, log warning + retorna 200 (provavelmente pagamento criado fora do sistema).
4. **Atualizar status local** baseado em `event.event`:
   - `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` → status='confirmed', paid_at=now()
   - `PAYMENT_OVERDUE` → status='overdue'
   - `PAYMENT_DELETED` → status='cancelled'
   - Outros eventos → log + ignore
5. **Marcar webhook event como processado** — `UPDATE billing_webhook_events SET processed_at = now()`.
6. **Revalidate paths** — `/app/obras/[id]`, `/app/financeiro`, `/q/[token]`.
7. **Resposta** — 200 sempre que processado (ou já tinha sido), 400 só pra payload malformado, 401 só pra token inválido.

**Segurança:**
- O endpoint é PÚBLICO (sem auth Supabase), protegido SÓ pelo token compartilhado.
- Token gerado uma vez e configurado no painel Asaas + nosso env.
- Constant-time comparison (`crypto.timingSafeEqual`) pra evitar timing attacks.
- Log estruturado em todo evento; nenhum payload PII exposto pro browser/usuário.

---

## 9. Server actions — superfície completa

### Em `web/src/app/app/orcamentos/actions.ts` (atualizada)
- `convertToProjectAction(quoteId, { templateId?, entryPct, cpfCnpj? })` — agora cria Asaas Customer + 2 cobranças + Pix da entrada

### Em `web/src/app/app/obras/[id]/actions.ts`
- `regenerateChargeAction(chargeId)` — útil se o Pix expirou; cria novo no Asaas
- `cancelChargeAction(chargeId)` — só draft/pending; cancela no Asaas + marca local

### Em `web/src/app/q/[token]/actions.ts`
- `approveDeliveryAction(token, signerName)` — anon, valida token, atualiza `projects.delivery_approved_at`, libera saldo (chama RPC + Asaas)

### Em `web/src/app/app/financeiro/actions.ts` (novo arquivo)
- `getCompanyBillingDashboard()` — totais do mês (recebido, pendente, atrasado), última atualização

---

## 10. UX — painel da obra com cobrança

**Inserção na página:** logo após `StagesSection`, antes do `DiarySection`. Card único com 2 sub-cards lado a lado no desktop, empilhados no mobile.

```
┌─ Cobrança ─────────────────────────────────────────────────┐
│  💰 Total: R$ 8.160 · Recebido: R$ 2.448 (30%) · Pendente │
│  R$ 5.712 (70%)                                            │
│                                                            │
│  ┌─ Entrada (R$ 2.448) ──┐ ┌─ Saldo (R$ 5.712) ───────┐   │
│  │ 🟢 Confirmado         │ │ ⚪ Aguardando entrega    │   │
│  │ Pago em 24/05/2026    │ │ Será liberado quando o   │   │
│  │ [Ver comprovante]     │ │ cliente confirmar a obra │   │
│  └───────────────────────┘ │ [Liberar agora →]        │   │
│                            └──────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Estados visuais

- `draft` / sem Pix gerado: ⚠️ amarelo, "Pix não gerado — [Gerar agora]"
- `pending`: 🔵 azul, "Aguardando pagamento · vence em 7 dias", botões [Copiar Pix] [Ver QR]
- `overdue`: 🟠 laranja, "Vencido em DD/MM"
- `received`/`confirmed`: 🟢 verde, "Pago em DD/MM · [Ver comprovante]"
- `cancelled`: ⚫ cinza, "Cancelada"

### Estados especiais do Saldo

- Obra em `planning/in_progress/paused` + `delivery_approved_at = null`: card de saldo mostra "Será liberado quando o cliente confirmar a obra", sem Pix.
- Obra em `completed` + saldo ainda `draft`: card mostra "Aguardando confirmação do cliente" + botão "Liberar agora" (workaround manual se cliente sumir).
- Saldo `pending`: igual entrada.

### Banner de alerta

Se obra está `in_progress` mas entrada `pending` ou `overdue`:
```
⚠️ Entrada ainda não paga — você pode prosseguir, mas considere
   confirmar com o cliente antes de comprar muito material.
```

---

## 11. UX — link público

Toggle ganha 3ª aba:

```
[📋 Orçamento] [🏗️ Andamento] [💰 Cobrança]
```

**Tab "Cobrança"** mostra os mesmos cards de Entrada/Saldo, simplificados pro cliente:
- Sem "draft" — se ainda não tem Pix, mostra "Aguardando empreiteiro gerar"
- Botão "Pagar agora" abre modal com QR + copia-cola Pix + link Asaas (invoice_url)
- Status "Confirmado" mostra data de pagamento + link pro comprovante

**Banner especial "Confirme a entrega":** aparece SE `obra.status = completed` E `delivery_approved_at = null`:

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Obra concluída! Confirme a entrega                      │
│                                                            │
│ A empreiteira marcou sua obra como concluída em 01/06.    │
│ Confirmando, o saldo de R$ 5.712 fica disponível pra      │
│ pagamento via Pix.                                         │
│                                                            │
│ [ Seu nome ] [ Confirmar entrega ]                         │
└─────────────────────────────────────────────────────────────┘
```

Submit → `approveDeliveryAction(token, signerName)` → libera saldo → Pix gerado → cliente paga no mesmo lugar.

---

## 12. UX — página /app/financeiro

Hoje é placeholder. Vai virar lista densa estilo `/app/orcamentos`:

```
Financeiro
─────────────────────────────────
Recebido este mês:  R$ 12.450
Pendente:           R$ 8.200
Atrasado:           R$  600

Filtros: [Todas] [Pendentes] [Recebidas] [Atrasadas]
Busca: [..............]

┌─────────────────────────────────────────────────┐
│ ENTRADA · Cobertura Maria Santos                │
│ R$ 2.448 · 🟢 Confirmado em 24/05/2026         │
│ Cliente: Maria Santos                           │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ SALDO · Reforma João Silva                      │
│ R$ 4.200 · 🟠 Vencido há 3 dias                │
│ Cliente: João Silva                             │
└─────────────────────────────────────────────────┘
...
```

Cada card é clicável → vai pro `/app/obras/[id]` correspondente.

Aggregations:
- "Recebido este mês" = soma de `amount_cents` onde `paid_at` está no mês atual (BR TZ)
- "Pendente" = soma onde status in (`pending`)
- "Atrasado" = soma onde status = `overdue`

---

## 13. Segurança & LGPD

### Webhook
- Token compartilhado validado constant-time
- IP do Asaas NÃO é checado (deles é mutável; token é suficiente)
- Endpoint sem rate-limiting próprio (Vercel já tem limit razoável). Adicionar middleware se aparecer abuso.

### Asaas API key
- `ASAAS_API_KEY` em `.env.local` (não vai pro git)
- Em prod, configurada em Vercel Env Vars
- `ASAAS_ENV = 'sandbox' | 'production'` separado; base URL deriva
- NUNCA expor em código client-side; `import "server-only"` em `lib/asaas/client.ts`

### CPF/CNPJ
- Armazenado em `customer_billing_profiles.cpf_cnpj` pra audit
- Não exibido no link público (escondido)
- Validação de formato no input mas SEM validação de dígitos verificadores (Asaas valida; se errado, retorna erro)

### Idempotência
- Webhook `event_id` único previne reprocessing
- `external_reference` da cobrança Asaas = `billing_charges.id` → dedupe ao criar Pix duplicado
- Constraint `billing_charges_one_per_kind_uq` previne 2 entradas no mesmo project

### Aprovação de entrega
- Endpoint anon mas exige token válido + nome (audit)
- `released_by_token` guarda 1ª-2ª-... etc (rotacionado se necessário)
- Empreiteiro pode forçar libração manualmente se cliente sumir (`projects.delivery_approved_at` + `released_at` com null token)

### RLS
- 4 policies tenant-scoped padrão em `customer_billing_profiles`, `billing_charges`
- `billing_webhook_events`: SEM policies — só admin client server-side acessa (nem cliente authenticated lê eventos do Asaas crus)
- Webhook handler usa admin client (precisa burlar RLS pra atualizar charge mesmo de empresas não-suas)

---

## 14. Performance & custos

### Calls Asaas
- Criar Customer: 1 vez por cliente (cacheado em billing_profile)
- Criar Pix: 2 vezes por obra (entrada + saldo) — mas saldo só quando libera
- Get QR: 1 vez por Pix (cacheado em `pix_qr_code`/`pix_qr_image_b64`)
- Webhook recebido: 1 por evento (gratuito, sem rate)

**Total típico por obra:** 3-4 calls Asaas.

### Taxa Asaas (estimativa, confirmo no sandbox)
- Pix: R$ 1,99 por transação OU 0,99% (o que for menor)
- Sem mensalidade
- Pago pelo empreiteiro (descontado do valor pago)

### Bandwidth
- QR code base64 ~10KB cada (cacheado em DB; sem regenerar)
- Webhook payload pequeno (<5KB)

### Vercel
- Webhook route runtime nodejs (`crypto.timingSafeEqual` precisa)
- Sem novas dependências pesadas

---

## 15. Testes

### Unit
- `lib/asaas/client.ts`: monta URL correta sandbox vs production
- `lib/asaas/webhook-verify.ts`: rejeita token errado, aceita correto, constant-time
- `lib/queries/billing.ts`: `getCostSummary` ganha noção de "% recebido"

### Integration (Supabase Postgres real)
- RLS: cobrança de outra company não visível
- RPC `create_billing_charges_for_project`: cria 2 rows corretas, calcula split do valor
- RPC rejeita entry_pct fora de [0,100]
- Constraint `billing_charges_one_per_kind_uq` previne duplicata

### E2E manual (no smoke da fase, via agent-browser ou similar)
- Quote aprovado → virar obra com 30% entrada → modal pede CPF → cria Pix entrada no Asaas sandbox
- Painel mostra Entrada `pending` com QR
- Simular webhook `PAYMENT_CONFIRMED` (POST manual no endpoint) → status muda pra `confirmed`
- Empreiteiro marca obra como completed → banner aparece em /q/[token]
- Cliente preenche nome + Confirmar entrega → saldo vira `pending` com Pix
- Webhook do saldo → `confirmed`
- `/app/financeiro` mostra ambas como recebidas no mês

### Sandbox Asaas
- Cada PR roda contra `https://sandbox.asaas.com/api/v3`
- Webhook configurado pra `https://<ngrok-ou-deploy>.tld/api/asaas/webhook`
- Token de teste documentado em README local (não git)

---

## 16. Quebra em PRs

| # | PR | Conteúdo | Estimativa |
|---|----|---------|-----|
| 1 | **Fundação Asaas** | Schema (3 tabelas + ALTER projects + 1 RPC), `lib/asaas/client+customers+payments`, env vars, testes de RLS, webhook stub (retorna 200 sem processar) | 1.5 dia |
| 2 | **Criar cobrança no convert** | `convertToProjectAction` ganha entryPct + cpfCnpj; modal atualizado; cria Asaas Customer; cria 2 charges + Pix da entrada; UI básica da seção Cobrança no painel da obra (read-only) | 2 dias |
| 3 | **Webhook + atualizações ao vivo** | Endpoint `/api/asaas/webhook` completo (auth, idempotência, status update), `revalidatePath`, retry/regenerar Pix expirado, cancelar charge | 1.5 dia |
| 4 | **Liberação de entrega + /q/[token] cobrança + /app/financeiro** | Banner de entrega no link público, `approveDeliveryAction`, tab Cobrança no toggle, página financeiro com lista + aggregations + filtros | 2 dias |

Total: ~7 dias.

---

## 17. Riscos & mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Webhook Asaas falha em chegar (down nosso, perdido) | Média | Alto | Asaas re-tenta com backoff até 24h. Adicionamos `lib/asaas/sync.ts` que pode rodar query manual em uma charge específica (botão "Atualizar status" no card). |
| Token vazado | Baixa | Alto | Rotação manual via Vercel env + Asaas panel; eventos com token antigo retornam 401. Audit log do webhook ajuda detectar. |
| Cliente paga via outro meio (boleto direto, dinheiro) | Média | Médio | Empreiteiro pode marcar charge como `confirmed` manualmente — adicionamos action `markPaidManuallyAction` em Fase 1.4.1 se virar dor; agora sai fora do escopo. |
| CPF inválido | Baixa | Baixo | Asaas valida; nossa UI mostra erro retornado |
| `external_reference` colide | Muito baixa | Médio | Usamos `billing_charges.id` (UUID) — colisão astronomicamente improvável |
| Entry pct = 0 ou 100% confunde fluxo | Baixa | Baixo | UI exibe casos: entrada=0 → "Sem entrada" + saldo único; entrada=100 → "Pagamento à vista" + sem saldo; ambos válidos |
| Cliente aprova entrega sem ter pago a entrada | Baixa | Médio | UI no link público mostra status da entrada antes do banner de aprovação; permite confirmar mesmo se inadimplente (negócio entre eles) |

---

## 18. Decisões registradas

| # | Tema | Decisão | Por quê |
|---|------|---------|---------|
| 1 | Modelo cobrança | Entrada + saldo na entrega | Casa com fluxo real do setor; 2 cobranças simples |
| 2 | % entrada | Empreiteiro escolhe na hora (default 30%, 0-100%) | Flexibilidade por obra |
| 3 | Cliente Asaas | Auto-cria no virar obra; pede CPF se faltar | Fluxo natural, não bloqueia cadastro de cliente |
| 4 | Webhook | URL pública + token + idempotência | Padrão da indústria, sem custo, sem latência |
| 5 | Taxas Asaas | Pagas pelo empreiteiro | Zero-cost; descontadas do valor pago |
| 6 | Notificações cliente | Asaas envia (email/SMS embutidos) | Sem Twilio/Resend nosso pro MVP |
| 7 | API key | Single key no `.env.local` (fundador) | MVP testa contra sandbox; multi-tenant subaccount na Fase 2 |
| 8 | Aprovação entrega | Cliente confirma no link público | Protege ambos os lados; libera saldo só após "ok" |
| 9 | Atraso de entrada | Painel alerta mas empreiteiro decide | Empreiteiro tem contexto do cliente; sistema não bloqueia |
| 10 | Pix only (sem boleto/cartão) | Pix tem >90% de adoção no setor; cliente já conhece | YAGNI; boleto/cartão Fase 2 |

---

## 19. O que vem depois

**Fase 1.5 candidatos:**
- Parcelamento (3x/6x/12x)
- Boleto + cartão como opções
- Cron de limpeza de fotos órfãs (debt da 1.3)
- Notificações por WhatsApp via Asaas (eles têm endpoint)
- "Marcar pago manualmente" pra cobrança recebida fora do sistema

**Fase 1.6 (analytics + landing):**
- PostHog
- Sentry
- Landing page real

**Fase 2 (subaccount Asaas):**
- Cada empresa tem API key própria; KYC; split payment com fee do SaaS

---

*Fim do design doc. Próximo passo: invocar writing-plans pra detalhar passo-a-passo de cada PR (≈4 PRs).*
