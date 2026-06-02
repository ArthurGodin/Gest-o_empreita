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
- Link público `/q/[token]`: cliente vê orçamento, aprova/rejeita, acompanha
  andamento, paga cobrança e confirma entrega sem login.
- Obras: conversão de orçamento aprovado, etapas, templates, diário com fotos,
  custos, ponto da equipe e link público de andamento.
- Financeiro: cobranças Pix Asaas, recebido, pendente, atrasado, gastos por
  categoria e margem por obra.
- CI: lint, typecheck, testes e build.

## Stack

- Next.js 16 App Router
- React 18
- TypeScript strict
- Tailwind CSS + shadcn/ui base
- Supabase Auth, Postgres, Storage e RLS
- Asaas para cobrança Pix
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

Para gerar cobranças Pix:

```env
ASAAS_API_KEY=
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=
```

Configure no Asaas o webhook:
`https://SEU-DOMINIO/api/asaas/webhook`

Header esperado:
`asaas-access-token: <ASAAS_WEBHOOK_TOKEN>`

## Checks

```bash
cd web
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Próxima Grande Entrega

**Validar cobrança em ambiente real e instrumentar venda.**

A base operacional do Asaas já existe: converter orçamento aprovado em obra cria
parcelas, gera Pix de entrada, mostra cobrança no painel da obra, processa
webhook, mostra cobrança no link público, libera saldo na confirmação de entrega
e reflete recebido/pendente/atrasado no financeiro.

O próximo passo para vender com segurança:

1. Validar Asaas sandbox ponta a ponta com webhook real.
2. Adicionar monitoramento de erro e analytics de funil.
3. Criar dados demo realistas para pitch e piloto.
4. Rodar um piloto controlado com 1 a 3 empreiteiros.

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
