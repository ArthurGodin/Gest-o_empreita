# Gestão Empreita

SaaS de gestão para empreiteiros pequenos (foco em coberturas e construção civil). Web-first, mobile-first real, multi-tenant.

> **Briefing completo do produto:** veja [`CLAUDE.md`](./CLAUDE.md).

---

## 🏗️ Estrutura do repositório

```
.
├── CLAUDE.md            # briefing do produto (visão, usuário, princípios)
├── README.md            # você está aqui
├── web/                 # app Next.js 14 (App Router + TS + Tailwind + shadcn/ui)
│   ├── src/
│   │   ├── app/         # rotas (App Router)
│   │   │   ├── page.tsx           # landing
│   │   │   ├── (auth)/            # login / signup
│   │   │   ├── auth/callback/     # callback OAuth Supabase
│   │   │   ├── onboarding/        # criação da empresa após signup
│   │   │   └── app/               # app autenticado (sidebar + nav mobile)
│   │   ├── components/
│   │   │   ├── ui/                # shadcn primitives (Button, Card, Input, Label)
│   │   │   └── app-shell/         # Sidebar, MobileNav
│   │   ├── lib/
│   │   │   ├── env.ts             # validação de env vars (zod)
│   │   │   ├── utils.ts           # cn, formatBRL, formatDateBR
│   │   │   ├── queries/           # queries reutilizáveis (server)
│   │   │   └── supabase/          # clients (browser, server, middleware) + types
│   │   └── middleware.ts          # renovação de sessão Supabase em toda request
│   └── .env.local.example
└── supabase/
    ├── migrations/
    │   └── 20260522000001_initial_schema.sql   # companies, customers, projects, quotes + RLS
    ├── seed.sql
    └── config.toml
```

---

## 🚀 Primeira vez — passos manuais (todos free)

Cada passo abaixo é **gratuito** e não exige cartão. Você só vai pagar Asaas/Stripe quando processar cobranças reais (e a taxa sai do valor recebido).

### 1. Criar conta no Supabase
1. Acesse https://supabase.com e faça signup (login com GitHub é o mais rápido).
2. Crie um **New Project**:
   - Name: `gestao-empreita`
   - Password do banco: gere uma forte e guarde no seu gerenciador
   - Region: `South America (São Paulo)` — menor latência para os clientes
3. Aguarde o provisionamento (~2 min).
4. Em **Project Settings → API**, copie:
   - `Project URL` → vai em `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → vai em `SUPABASE_SERVICE_ROLE_KEY` (NUNCA exponha no client)

### 2. Rodar a migration no Supabase
1. No Supabase Studio, vá em **SQL Editor → New query**.
2. Cole o conteúdo de [`supabase/migrations/20260522000001_initial_schema.sql`](./supabase/migrations/20260522000001_initial_schema.sql).
3. Clique em **Run**. Deve criar 6 tabelas com RLS habilitado.

> Quando estiver mais maduro, instale a **Supabase CLI** (`npm i -g supabase`) e use `supabase link` + `supabase db push` para versionar via migrations. Por enquanto SQL Editor já resolve.

### 3. Rodar localmente
```bash
cd web
cp .env.local.example .env.local
# Preencha as 3 keys do Supabase no .env.local
npm install
npm run dev
```
Abra http://localhost:3000.

### 4. Configurar Auth no Supabase
No Supabase Studio → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: adicione `http://localhost:3000/auth/callback`

Em **Authentication → Providers → Email**, mantenha habilitado (já vem). Para dev, **desabilite "Confirm email"** para testar mais rápido.

### 5. Deploy no Vercel (free)
1. Suba o código para o GitHub (privado é grátis).
2. Acesse https://vercel.com e logue com GitHub.
3. **Import Project** → selecione o repo.
4. Configure:
   - **Root Directory**: `web`
   - **Environment Variables**: as 3 do Supabase + `NEXT_PUBLIC_APP_URL=https://SEU-PROJETO.vercel.app`
5. Deploy. O domínio `SEU-PROJETO.vercel.app` é grátis.
6. Volte no Supabase **Authentication → URL Configuration** e adicione o domínio do Vercel em **Site URL** e **Redirect URLs** (`https://SEU-PROJETO.vercel.app/auth/callback`).

---

## 🧰 Stack — tudo free tier no MVP

| Camada           | Serviço                | Custo no MVP                                |
| ---------------- | ---------------------- | ------------------------------------------- |
| Frontend         | Next.js 14 + Vercel    | Free (Hobby, 100GB bandwidth/mês)           |
| DB + Auth + Storage | Supabase            | Free (500MB DB, 1GB storage, 50k MAU)       |
| Email            | Resend (a integrar)    | Free (100/dia, 3k/mês)                      |
| Cobrança         | Asaas (a integrar)     | Cobra % por transação **paga** — escala com receita |
| CI               | GitHub Actions         | Free (2000min/mês em privado, ilimitado público) |
| Erros (opcional) | Sentry                 | Free (5k eventos/mês)                       |

Nada de Twilio (cobra por SMS desde o 1º) — substituímos por links `wa.me` click-to-chat (grátis).

---

## 📍 Onde estamos — Fase 0 entregue

- [x] Next.js 14 + TS strict + Tailwind + App Router
- [x] shadcn/ui base (Button, Card, Input, Label) + tema laranja construção
- [x] Supabase: client (browser/server) + middleware de sessão + RLS no schema
- [x] Schema multi-tenant: companies, company_members, customers, projects, quotes, quote_items
- [x] Auth: login, signup, logout, onboarding (criação da empresa)
- [x] App shell: sidebar desktop + bottom nav mobile (5 seções)
- [x] Landing page em PT-BR com tom do setor
- [x] CI no GitHub Actions (lint + typecheck + build)
- [x] Build de produção limpo

## 🗺️ Próximas fases (ordem de valor para o negócio)

### Fase 1 — Clientes + Orçamento (próximo) ⭐
- [ ] CRUD de clientes (lista, criar, editar, deletar)
- [ ] Catálogo de itens recorrentes (telha, manta, m² de cobertura, hora de mão de obra)
- [ ] Editor de orçamento (itens, qtd, preço unitário, desconto, totais em tempo real)
- [ ] Numeração automática por empresa (ORC-2026-0001)
- [ ] Link público `/q/[token]` para o cliente abrir no celular sem login
- [ ] Aprovação / rejeição digital pelo cliente
- [ ] Notificação por email (Resend) quando cliente abre/aprova
- [ ] Geração de PDF do orçamento (server-side com `@react-pdf/renderer`)

### Fase 2 — Obras (depois que orçamento estiver redondo)
- [ ] Converter orçamento aprovado em obra (1 clique)
- [ ] Etapas da obra (Kanban ou lista ordenada)
- [ ] Diário de obra com upload de fotos (Supabase Storage)
- [ ] Dashboard da obra: prazo, % concluído, custo vs. previsto

### Fase 3 — Cobrança (Asaas)
- [ ] Setup Asaas sandbox
- [ ] Gerar cobrança Pix/boleto a partir da obra
- [ ] Webhook de pagamento → marca como pago
- [ ] Cliente recebe link de pagamento por WhatsApp (wa.me)

### Fase 4+ — Diferenciação
- [ ] PWA + ponto eletrônico com geolocalização
- [ ] Materiais e estoque
- [ ] Financeiro / fluxo de caixa
- [ ] Relatórios e BI

---

## 🛡️ Qualidade não-negociável

- TypeScript strict + `noUncheckedIndexedAccess`
- RLS habilitado em **todas** as tabelas — tenant A nunca enxerga dado de B
- CI rodando em todo PR (lint + typecheck + build)
- Build deployável no `main` o tempo todo
- Loading states em toda operação assíncrona
- Linguagem do setor em todo lugar (zero jargão de software)

---

## 🤝 Convenções

- **Idioma:** UI sempre em PT-BR (linguagem do empreiteiro: obra, peão, orçamento, cliente)
- **Dinheiro:** sempre em **centavos** no banco (`bigint`), formatação só na UI via `formatBRL()`
- **Datas:** `YYYY-MM-DD` ou `timestamptz` no banco; formatar com `formatDateBR()`
- **Server vs client:** prefira Server Components + Server Actions. Use `"use client"` só quando precisar de interatividade
- **Mutations:** sempre via Server Actions com validação zod no servidor
- **Erros do usuário:** mensagens em PT-BR claras (`"Email ou senha incorretos."`), nunca expor stack trace

---

## 📞 Próximo passo recomendado

Quando você terminar os **5 passos manuais acima** (criar Supabase, rodar a migration, configurar env, rodar local, fazer signup pelo /signup), me avise. A partir daí, atacamos a **Fase 1 — CRUD de Clientes + Editor de Orçamento + Link público**, que é onde o produto começa a ter valor real para o empreiteiro.
