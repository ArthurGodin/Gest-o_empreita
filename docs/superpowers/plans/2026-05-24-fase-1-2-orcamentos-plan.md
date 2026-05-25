# Fase 1.2 — Plano de Implementação

**Spec:** [2026-05-24-fase-1-2-orcamentos-design.md](../specs/2026-05-24-fase-1-2-orcamentos-design.md)
**Estimativa total:** 7-9 dias divididos em 5 PRs incrementais
**Princípio:** cada PR ship independentemente. Sempre mantém `main` deployável.

---

## PR 1 — Fundação (~1-1.5 dia)

**Objetivo:** schema novo + storage buckets + libs utilitárias. Nada de UI nova ainda.

### Migration `20260526000001_quotes_module.sql` (idempotente)

- [ ] Enum `quote_approval_action ('approved','rejected')`
- [ ] Tabela `catalog_items` (+ unique index case-insensitive, search index, RLS tenant-scoped padrão)
- [ ] Tabela `quote_approvals` (+ RLS: SELECT tenant-scoped, INSERT só via admin)
- [ ] Tabela `quote_sequences` (sem RLS policies — só function acessa)
- [ ] Function `next_quote_number(p_company_id uuid)` SECURITY DEFINER atômica
- [ ] Trigger `tg_quotes_ensure_share_token` (32 bytes base64 url-safe)
- [ ] Trigger `tg_set_updated_at` em catalog_items
- [ ] ALTER `quotes` adicionar `pdf_storage_path text`, `notification_sent_at timestamptz`
- [ ] Buckets storage `company-logos` (público read) e `quotes-pdf` (privado)

### Código (lib/)

- [ ] `web/src/lib/quote-token.ts` — `generateShareToken()` com 32 bytes random
- [ ] `web/src/lib/supabase/storage.ts` — `uploadCompanyLogo`, `getPublicLogoUrl`, `uploadQuotePdf`, `getQuotePdf`
- [ ] `web/src/lib/quote-status.ts` — helpers state machine: `isEditable(status)`, `canTransitionTo(from, to)`, `effectiveStatus(quote)` (deriva `expired`)
- [ ] `web/src/lib/env-server.ts` — adicionar `RESEND_API_KEY` (optional em dev)
- [ ] `web/.env.local.example` — documentar RESEND_API_KEY
- [ ] `web/src/lib/supabase/types.ts` — adicionar tipos das 3 tabelas novas

### Validação

- [ ] `npm run build` passa limpo (12+ rotas)
- [ ] Migration roda em branch limpo do Supabase Studio sem erro
- [ ] Re-run da migration roda sem erro (idempotência)

**Commit:** `feat(quotes): foundation — schema + libs (PR 1/5)`

---

## PR 2 — Catálogo de itens (~1 dia)

**Objetivo:** página `/app/catalogo` funciona standalone. Empreiteiro consegue cadastrar/listar/apagar itens reutilizáveis. Autocomplete component pronto pra usar em editor (próximo PR).

### Backend

- [ ] `web/src/lib/queries/catalog.ts` — `getCatalogItems(query?)`, `suggestCatalog(query, limit=5)` ordenado por `usage_count desc, last_used_at desc`
- [ ] `web/src/app/app/catalogo/actions.ts` — `createCatalogItem`, `updateCatalogItem`, `deleteCatalogItem`, `incrementUsage(id)` (chamado depois quando editor usa item)
- [ ] Server actions seguem padrão de customers (zod + scope por company_id + log/clientErrorFor)

### UI

- [ ] `web/src/app/app/catalogo/page.tsx` — lista server component
- [ ] `web/src/app/app/catalogo/catalog-list.tsx` — client component com busca local
- [ ] `web/src/app/app/catalogo/item-dialog.tsx` — dialog modal pra criar/editar (descrição, unit, default_price)
- [ ] Empty state com CTA "Cadastrar primeiro item"
- [ ] Adicionar "Catálogo" no Sidebar e MobileNav (entre Clientes e Financeiro)

### Componente reutilizável

- [ ] `web/src/components/catalog-autocomplete.tsx` — client component com input + dropdown de sugestões. Props: `value`, `onSelect(item)`, `placeholder`. Debounce 200ms, fetch via server action ou route handler. **Vai ser usado no editor do próximo PR.**

### Validação

- [ ] CRUD funciona ponta a ponta (criar, listar, editar, apagar)
- [ ] Busca local filtra por descrição
- [ ] Autocomplete dropdown abre, mostra resultados, click preenche valor

**Commit:** `feat(catalogo): CRUD + autocomplete component (PR 2/5)`

---

## PR 3 — Editor de orçamento + lista (~2 dias)

**Objetivo:** empreiteiro consegue criar, editar e listar orçamentos. Sem link público ainda. Funciona em draft, sent (placeholder), aprovado (placeholder, sem flow real).

### Backend

- [ ] `web/src/lib/queries/quotes.ts` — `getQuotes`, `getQuote`, `getQuoteWithRelations` (company + customer + items + approvals)
- [ ] `web/src/app/app/orcamentos/actions.ts`:
  - `createQuoteAction(formData)` — chama `next_quote_number`, cria quote draft + 1 item vazio
  - `updateQuoteAction(id, draft)` — atualiza título, descrição, valid_until, notes, items (delete+insert ou upsert position-based)
  - `duplicateQuoteAction(id)` — copia quote + items, status draft, número novo
  - `deleteQuoteAction(id)` — só permite se status='draft'

### UI

- [ ] `web/src/app/app/orcamentos/page.tsx` — lista server component, fetcha quotes ordenado por created_at desc
- [ ] `web/src/app/app/orcamentos/quote-list.tsx` — client com:
  - Filtro por status (chips: Todos | Rascunho | Enviado | Aprovado | Rejeitado | Expirado)
  - Busca por número/cliente (debounced)
  - Card por quote (mobile) / linha (desktop)
- [ ] `web/src/app/app/orcamentos/novo/page.tsx` — form criar (escolhe cliente via dropdown), redirect pra `[id]` em draft
- [ ] `web/src/app/app/orcamentos/[id]/page.tsx` — server component que renderiza editor ou view dependendo do status
- [ ] `web/src/app/app/orcamentos/[id]/quote-editor.tsx` — client component grande:
  - State `items: ItemDraft[]`
  - `<ItemRow />` por item (responsivo)
  - `<CatalogAutocomplete />` na descrição
  - Total recalculado em useMemo
  - Botão "Adicionar item"
  - Botão "Salvar"
  - Drag-to-reorder via `@dnd-kit/core` (install no PR)
- [ ] `web/src/app/app/orcamentos/[id]/item-row.tsx`:
  - Desktop ≥768px: grid 6 colunas
  - Mobile <768px: card stack
  - Botão 💾 "Salvar no catálogo" (visible só se descrição não bate exatamente com catálogo)
  - Botão × remover linha

### Conversão orçamento → estado read-only

- [ ] Quando status ≠ draft, editor entra em modo read-only com banner "Esse orçamento já foi enviado. Pra mudar, clique em Duplicar."

### Dashboard update

- [ ] `web/src/app/app/page.tsx` — quick action "Novo orçamento" agora aponta pra rota funcional

### Validação

- [ ] Criar orçamento → numeração `ORC-2026-0001` aparece
- [ ] Adicionar 3 itens, alterar quantidades, ver total atualizar em tempo real
- [ ] Salvar → recarrega persiste
- [ ] Voltar pra lista → quote aparece com cliente/total/status
- [ ] Mobile responsive em viewport 390x844

**Commit:** `feat(orcamentos): editor + lista + drag-reorder (PR 3/5)`

---

## PR 4 — Link público + aprovação digital + email (~2 dias) ⭐

**Objetivo:** o "uau" do produto. Empreiteiro clica "Enviar", recebe URL, manda no WhatsApp. Cliente abre, aprova com nome. Empreiteiro recebe email.

### Backend

- [ ] `web/src/app/app/orcamentos/actions.ts` adicionar:
  - `sendQuoteAction(id)` — quote precisa ter ≥1 item, valid_until preenchido, customer; muda status pra `sent`, seta `sent_at`. Retorna URL do link público.
  - `revokeShareTokenAction(id)` — gera novo token, invalida anterior (pra empreiteiro reenviar com link novo se vazou)
- [ ] `web/src/app/q/[token]/actions.ts` (anon, usa admin client):
  - `getPublicQuote(token)` — busca por token, expand relations
  - `recordViewAction(token)` — idempotente: seta status=viewed se era sent + viewed_at se null
  - `approveQuoteAction(token, name)` — valida nome ≥2 chars, valida status sent|viewed, valida não expirado, transaction: update quote + insert quote_approvals (com IP do header + user_agent), dispara email
  - `rejectQuoteAction(token, name, reason?)` — simétrico

### Middleware update

- [ ] `web/src/middleware.ts` adicionar `/q` em PUBLIC_PATHS (não exige auth, mas ainda processa cookies se vier autenticado pra evitar quebrar layout depois)

### UI pública

- [ ] `web/src/app/q/[token]/page.tsx` — Server Component, sem `(app)` layout:
  - Carrega quote via admin client
  - Marca viewed se sent
  - Renderiza `<PublicQuoteView />` com layout mobile-first
- [ ] `web/src/app/q/[token]/public-quote-view.tsx` — componente que renderiza estados:
  - `sent` ou `viewed`: mostra orçamento + `<ApprovalForm />`
  - `approved`: banner verde + "Baixar PDF" (placeholder até PR 5)
  - `rejected`: banner cinza
  - `expired`: banner amarelo, sem ações
- [ ] `web/src/app/q/[token]/approval-form.tsx` — client component:
  - Input nome (autoFocus)
  - Botão "Aprovar" (verde, grande, 44px+ height)
  - Botão "Pedir mudanças" (variant outline) → abre textarea de motivo opcional
- [ ] `web/src/app/q/[token]/aprovado/page.tsx` — confirmação pós-aprovação

### UI empreiteiro (editor)

- [ ] `web/src/app/app/orcamentos/[id]/send-quote-button.tsx` — botão "Enviar pro cliente"
  - Pre-flight: valida tem ≥1 item + customer + valid_until
  - Dialog confirma envio
  - Server action retorna URL → exibe modal "Pronto! Copia esse link e cola no WhatsApp do cliente" com botão copy-to-clipboard e botão de abrir WhatsApp Web (`https://wa.me/<customer.phone>?text=<link>`)
- [ ] No editor read-only, mostrar URL do link público + botão "Reenviar com novo link" (revokeShareTokenAction)

### Email (Resend)

- [ ] `npm install resend`
- [ ] `web/src/lib/email/client.ts` — instancia Resend (chave em env-server, optional)
- [ ] `web/src/lib/email/templates/quote-approved.tsx` — React component (Resend suporta JSX)
- [ ] `web/src/lib/email/templates/quote-rejected.tsx` — idem
- [ ] No `approveQuoteAction` / `rejectQuoteAction`:
  - Após save, try/catch send email pro owner da empresa (busca via company_members + auth.users.email)
  - Idempotência via `quotes.notification_sent_at`
  - Falha não falha aprovação

### Validação E2E

- [ ] Criar quote, adicionar itens, definir valid_until, salvar
- [ ] Click "Enviar pro cliente" → ver URL gerada
- [ ] Abrir URL em janela anônima → ver layout mobile do link público
- [ ] Logo da empresa aparece (se cadastrada) — sem logo: placeholder genérico (sem quebrar)
- [ ] Digitar nome + Aprovar → ver redirect /aprovado
- [ ] Voltar como empreiteiro → ver status=approved, signer name no detail
- [ ] Email recebido em inbox (dev pode usar `console.log` se RESEND_API_KEY não setado)
- [ ] Mexer no calendário do sistema (ou setar valid_until=ontem em DB) → tentar acessar → ver banner expired

**Commit:** `feat(quotes): link público + aprovação + email (PR 4/5)`

---

## PR 5 — PDF + logo upload + conversão pra obra (~1.5 dia)

**Objetivo:** completar o módulo. PDF de qualidade, logo no header, conversão de orçamento aprovado em obra.

### Configurações da empresa

- [ ] `web/src/app/app/configuracoes/page.tsx` — server component
- [ ] `web/src/app/app/configuracoes/company-form.tsx` — client form (todos campos da company)
- [ ] `web/src/app/app/configuracoes/actions.ts` — `updateCompanyAction(formData)` (zod + tenant scope)
- [ ] `web/src/app/app/configuracoes/logo-upload.tsx` — client:
  - Drag-drop zone (`react-dropzone` ou input nativo)
  - Preview da logo atual
  - Botão "Trocar logo"
- [ ] `npm install sharp` — pra resize server-side
- [ ] Server action `uploadCompanyLogoAction(formData)`:
  - Valida arquivo (mime png/jpg/webp, size ≤2MB)
  - Resize com sharp pra 256×256 max (fit: inside, no upscale)
  - Upload via admin client pro bucket `company-logos/<company_id>.png`
  - Update `companies.logo_url` com public URL
- [ ] Nudge no dashboard se `logo_url is null`: card dismissible "Adicione sua logo pro orçamento ficar mais profissional"

### PDF

- [ ] `npm install @react-pdf/renderer`
- [ ] `web/src/lib/pdf/quote-pdf.tsx` — componente:
  - Header: logo + dados da empresa (esquerda/direita)
  - Título do orçamento
  - Bloco cliente
  - Tabela de itens (description / qtd / un / unit_price / total)
  - Total destacado
  - Observações
  - Footer com validade
- [ ] `web/src/app/api/quotes/[id]/pdf/route.ts` — autenticado:
  - Verifica session + company match
  - Se `pdf_storage_path` existe e `updated_at <= mtime do arquivo`: streama do Storage
  - Senão: gera + upload + serve
- [ ] `web/src/app/q/[token]/pdf/route.ts` — anon:
  - Valida token bate com quote
  - Mesma lógica de cache
- [ ] No editor (status=approved): botão "Baixar PDF"
- [ ] Na página pública (status=approved): botão "Baixar PDF" no banner verde

### Conversão pra obra

- [ ] `web/src/app/app/orcamentos/[id]/convert-to-project.tsx` — client component:
  - Botão "Virar obra" (só visible se status=approved E project_id is null)
  - Dialog confirma
- [ ] Server action `convertToProjectAction(quoteId)`:
  - Cria `projects` row (company_id, customer_id, name=quote.title, address=customer.address, budget_cents=quote.total_cents, status='planning', starts_on=today)
  - Update `quotes.project_id`
  - Redirect pra `/app/obras/[novo_id]`
- [ ] `web/src/app/app/obras/[id]/page.tsx` — placeholder por enquanto:
  - "Obra **${name}** criada a partir do orçamento ${quote.number}"
  - "Painel completo dessa obra vem na Fase 1.3. Por enquanto: você pode ver lá em /app/obras"
- [ ] `web/src/app/app/obras/page.tsx` — lista básica (nome, customer, status, budget)

### Validação E2E final

- [ ] Sem logo: link público + PDF funcionam com placeholder
- [ ] Upload logo: link público + PDF mostram logo correta
- [ ] PDF baixado abre limpo em navegador, layout legível
- [ ] Aprovar orçamento → ver botão "Virar obra" → click → redirect pra placeholder de obra
- [ ] Lista de orçamentos mostra status correto com chip colorido
- [ ] Verify: agent-browser teste E2E completo do fluxo inteiro

**Commit:** `feat(quotes): PDF + logo + conversão pra obra — Fase 1.2 fechada (PR 5/5)`

---

## Ordem de execução

1. **Sempre commitar após cada PR completo** — manter `main` deployável
2. **Sempre rodar `npm run build` antes de commitar** — validar tipos e lint
3. **Após cada PR, fazer um `verify` rápido com agent-browser** dos fluxos novos antes de seguir
4. **Code-review + security-review automatizados após PR 4** (o que tem mais superfície sensível: link público anon + email externo)

## Manual steps requeridos do fundador (rotulados)

- 🔧 [PR 1] Rodar migration `20260526000001_quotes_module.sql` no SQL Editor do Supabase
- 🔧 [PR 4] Criar conta grátis no resend.com, gerar API key, colocar em `web/.env.local` como `RESEND_API_KEY`
- 🔧 [PR 5] Verificar que buckets `company-logos` e `quotes-pdf` existem no Storage do Supabase (foram criados pela migration mas convém conferir)
- 🔧 [Final] (opcional) Registrar domínio pra emails saírem de `noreply@seudominio.com.br` em vez de `onboarding@resend.dev` (gasto R$40/ano fora do free tier)

---

## Critérios de "Fase 1.2 completa"

- [ ] Empreiteiro consegue criar orçamento em <8min na primeira vez, <4min na quinta vez
- [ ] Cliente abre link no celular e aprova em <2min
- [ ] Email chega pro empreiteiro em <30s após aprovação
- [ ] PDF é gerado em <3s primeira vez, <500ms cacheado
- [ ] Build de produção: ≤16 rotas, todas type-safe, ESLint clean
- [ ] Verify E2E completo passa sem manual intervention
- [ ] Code-review + security-review fechados sem findings critical/high
