# Gestão Empreita

SaaS web-first para pequenas empreiteiras criarem orçamentos profissionais,
receberem aprovação digital do cliente e acompanharem obras com etapas, fotos,
custos, ponto e margem estimada.

O foco comercial atual é simples: **fazer o dono vender melhor e parar de perder
dinheiro na execução da obra**.

## Produto Hoje

- Autenticação, onboarding e multi-tenant com Supabase RLS.
- Clientes: cadastro, lista, detalhe, edição e exclusão.
- Catálogo: itens recorrentes para montar orçamento mais rápido.
- Orçamentos: criação, editor de itens, status, duplicação, PDF e link público.
- Link público `/q/[token]`: cliente vê orçamento, aprova ou rejeita sem login.
- Obras: conversão de orçamento aprovado, etapas, templates, diário com fotos,
  custos, ponto da equipe e link público de andamento.
- Financeiro básico: aprovado, gastos, margem estimada, gastos por categoria e
  margem por obra.
- CI: lint, typecheck, testes e build.

## Stack

- Next.js 16 App Router
- React 18
- TypeScript strict
- Tailwind CSS + shadcn/ui base
- Supabase Auth, Postgres, Storage e RLS
- Resend para email transacional opcional
- React PDF para geração de orçamento em PDF
- Vitest para testes unitários

## Rodar Localmente

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`.

Variáveis mínimas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Checks

```bash
cd web
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Próxima Grande Entrega

**Cobrança Pix com Asaas.**

Essa é a próxima peça que transforma o app de ferramenta operacional em produto
que captura dinheiro:

1. Criar cobrança de entrada ao converter orçamento aprovado em obra.
2. Mostrar cobrança no painel da obra e no link público do cliente.
3. Receber webhook do Asaas e atualizar status.
4. Liberar saldo na entrega.
5. Evoluir `/app/financeiro` de margem estimada para contas recebidas,
   pendentes e atrasadas.

O desenho completo está em:
`docs/superpowers/specs/2026-05-25-fase-1-4-cobranca-asaas-design.md`.

## Direção Comercial

Não vender como ERP completo.

Vender como:

> O sistema para empreiteiro criar orçamento bonito, aprovar pelo celular e
> controlar obra com foto, gasto e margem.

ICP inicial:

- Pequenas empreiteiras e empresas de cobertura.
- 3 a 20 funcionários.
- Dono opera pelo WhatsApp e planilha.
- Ticket sugerido inicial: R$ 197/mês, trial de 14 dias sem cartão.

## Documentos Importantes

- `CLAUDE.MD`: visão original do produto.
- `docs/DIRECIONAMENTO_EXECUTIVO.md`: plano prático para transformar em produto vendável.
- `docs/superpowers/specs/`: specs de fases já desenhadas.
- `supabase/migrations/`: schema versionado.

## Critério de Produto Vendável

Antes de vender para mais de 5 pilotos:

- Build limpo em produção.
- Fluxo demo completo com dados realistas.
- Landing sem prometer feature inexistente.
- Sentry ou monitoramento equivalente.
- Analytics mínimo de funil.
- Termos de uso e política de privacidade.
- Cobrança Asaas em sandbox validada ponta a ponta.
