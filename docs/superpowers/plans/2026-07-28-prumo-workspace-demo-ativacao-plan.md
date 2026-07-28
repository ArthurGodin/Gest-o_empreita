# Prumo - Plano de implementacao do workspace demo

**Spec:** [2026-07-28-prumo-workspace-demo-ativacao-design.md](../specs/2026-07-28-prumo-workspace-demo-ativacao-design.md)

## Objetivo

Separar demonstracoes da operacao real, impedir efeitos financeiros externos em
contas demo e tornar o primeiro uso de uma conta live mais curto e contextual.

## Ordem de execucao

1. dominio, migration, tipos e consultas;
2. guardas financeiros no servidor;
3. kit e central de demonstracao;
4. shell, planos e ativacao mobile;
5. auditoria comercial e regressao;
6. migration remota, provisionamento, deploy e smoke.

## Lote 1 - Dominio e banco

### Tarefa 1 - Dominio de workspace

- criar `WorkspaceMode`;
- normalizar valores desconhecidos como `live`;
- definir mensagens e erro tipado para operacoes externas bloqueadas;
- criar helper server-side que carrega o modo pela empresa;
- testar normalizacao, liberacao live e bloqueio demo.

Arquivos:

- `web/src/lib/workspace-mode.ts`
- `web/src/lib/workspace-mode.test.ts`
- `web/src/lib/workspace-mode-server.ts`

### Tarefa 2 - Migration aditiva

- adicionar `companies.workspace_mode`;
- aplicar `not null`, padrao `live` e check constraint;
- exigir plano Ultimate quando a empresa for demo;
- incluir o campo na protecao de entitlement;
- impedir insert/update pelo papel autenticado;
- atualizar tipos Supabase e contratos de empresa.

Arquivos:

- `supabase/migrations/20260728000001_demo_workspaces.sql`
- `web/src/lib/supabase/types.ts`
- `web/src/lib/queries/company.ts`
- `web/src/lib/queries/company-settings.ts`

Checkpoint:

`feat: add protected demo workspace mode`

## Lote 2 - Barreiras financeiras

### Tarefa 3 - Assinatura Prumo

- bloquear checkout, cancelamento e ativacao simulada em demo;
- repetir o bloqueio dentro da biblioteca de faturamento SaaS;
- evitar consulta externa de assinatura na pagina de plano demo;
- impedir webhook de ativar ou rebaixar uma empresa demo;
- manter comportamento live inalterado.

Arquivos:

- `web/src/app/app/configuracoes/plano/actions.ts`
- `web/src/app/app/configuracoes/plano/checkout/page.tsx`
- `web/src/lib/asaas/saas-billing.ts`
- `web/src/lib/asaas/webhook-saas.ts`
- testes existentes de checkout e webhook.

### Tarefa 4 - Cobrancas de clientes

- bloquear Pix manual e Asaas antes de produzir payload ou requisicao externa;
- proteger `ensureBillingProfile`, `generatePixForCharge` e o provider central;
- bloquear alteracao de recebimento em demo;
- manter cobrancas locais em rascunho para o kit.

Arquivos:

- `web/src/lib/billing/provider.ts`
- `web/src/lib/billing/asaas.ts`
- `web/src/app/app/configuracoes/actions.ts`
- `web/src/app/app/obras/[id]/actions.ts`
- testes focados.

Checkpoint:

`feat: block real billing in demo workspaces`

## Lote 3 - Demonstracao real

### Tarefa 5 - Endurecer o kit

- exigir workspace demo;
- preservar cenarios por segmento;
- manter criacao de cobrancas somente locais;
- revalidar a nova central;
- registrar criacao e restauracao sem PII;
- nunca excluir dados extras do avaliador.

Arquivos:

- `web/src/app/app/configuracoes/diagnostico/actions.ts`
- `web/src/app/app/configuracoes/diagnostico/demo-kit-button.tsx`
- `web/src/lib/product-event-names.ts`

### Tarefa 6 - Snapshot e roteiro

- consultar proposta e projeto canonicos do workspace;
- montar etapas compativeis com o segmento;
- criar `/app/demonstracao`;
- oferecer links para proposta, portal, PDF, projeto, briefing, ambientes,
  entregas e financeiro;
- preparar ou restaurar o cenario com confirmacao;
- usar interface compacta e uma acao principal.

Arquivos:

- `web/src/lib/queries/demo-workspace.ts`
- `web/src/lib/demo-workspace.ts`
- `web/src/lib/demo-workspace.test.ts`
- `web/src/app/app/demonstracao/page.tsx`
- componentes locais pequenos quando necessario.

Checkpoint:

`feat: add guided demo workspace`

## Lote 4 - Shell, planos e ativacao

### Tarefa 7 - Identificacao persistente

- mostrar `Demo` junto da empresa no sidebar e topbar;
- adicionar `Demonstracao` no sidebar;
- adicionar o destino no menu mobile, sem ultrapassar cinco itens no bottom nav;
- manter foco, deep link e alvo de toque adequados.

Arquivos:

- `web/src/app/app/layout.tsx`
- `web/src/components/app-shell/sidebar.tsx`
- `web/src/components/app-shell/mobile-topbar.tsx`

### Tarefa 8 - Plano demonstrativo

- mostrar `Ultimate demonstracao`;
- omitir status externo, upgrade, checkout e cancelamento;
- manter lista honesta de recursos Ultimate;
- redirecionar tentativa de checkout demo para a pagina protegida.

Arquivos:

- `web/src/app/app/configuracoes/plano/page.tsx`
- `web/src/app/app/configuracoes/plano/checkout/page.tsx`

### Tarefa 9 - Primeiro contrato

- esconder o checklist em demo;
- remover criacao de exemplo de workspaces live;
- adaptar titulo por segmento;
- iniciar checklist recolhido;
- manter progresso, proxima acao e CTA visiveis;
- rastrear expansao e clique da proxima acao.

Arquivos:

- `web/src/lib/activation/activation-core.ts`
- `web/src/lib/activation/activation-core.test.ts`
- `web/src/app/app/first-money-guide.tsx`
- `web/src/app/app/page.tsx`
- `web/src/lib/product-event-names.ts`

Checkpoint:

`feat: refine live activation and demo plan UX`

## Lote 5 - Fidelidade e qualidade

### Tarefa 10 - Promessas

- comparar `PLAN_DEFINITIONS` com os gates implementados;
- confirmar marca, cotas, SINAPI, CSV, entregas, briefing e ambientes;
- mudar copy somente diante de divergencia comprovada;
- garantir que demo nao apareca como beneficio comercial.

### Tarefa 11 - Testes

- testes unitarios de dominio e roteiro;
- testes server-side dos bloqueios;
- regressao de billing e webhook;
- isolamento entre live e demo;
- idempotencia do kit;
- `npm test`;
- `npm run typecheck`;
- `npm run lint -- --no-cache`;
- `npm run build`;
- `git diff --check`.

### Tarefa 12 - QA

- carregar workflow `agent-browser skills get core --full`;
- carregar workflow `agent-browser skills get dogfood`;
- validar 360x800, 390x844, 768x1024 e 1440x900;
- testar demo e live;
- confirmar ausencia de overflow, zoom e sobreposicao;
- confirmar que tentativas financeiras demo nao criam cobranca;
- salvar relatorio em `dogfood-output`.

## Lote 6 - Rollout

### Tarefa 13 - Banco e contas

- aplicar a migration remota depois dos gates;
- marcar somente contas de demonstracao confirmadas;
- definir `workspace_mode = demo` e `plan = ultimate` na mesma operacao;
- confirmar ausencia de assinatura Asaas vinculada antes da mudanca.

### Tarefa 14 - Publicacao

- commitar somente arquivos do lote;
- preservar `docs/CHECKLIST_LANCAMENTO.md`;
- publicar o mesmo estado validado;
- acompanhar CI e Vercel ate estado terminal;
- executar smoke autenticado live e demo;
- nao gerar pagamento real.

## Invariantes

- Workspace desconhecido nao libera comportamento demo.
- Falha ao carregar modo bloqueia efeito financeiro.
- Usuario comum nao promove empresa live para demo.
- Empresa demo nao cria checkout, cliente Asaas, Pix real ou assinatura.
- Empresa live preserva os fluxos atuais.
- Dados nunca atravessam empresas.
- O kit nao exclui dados criados pelo avaliador.
- Demo Ultimate nao conta como assinatura nem receita.
- Nenhuma promessa nova e publicada antes dos gates.
- O checklist alterado pelo usuario fica fora dos commits.

## Criterios de pronto

1. Live e demo sao separados no banco e na interface.
2. O servidor bloqueia todos os efeitos financeiros mapeados em demo.
3. A central abre recursos reais por links diretos.
4. Arquitetura demonstra proposta, briefing, ambientes e entregas.
5. Conta live inicia vazia e orientada ao primeiro cliente real.
6. O checklist mobile fica compacto e contextual.
7. Plano demo e mostrado como Ultimate sem assinatura.
8. Planos publicos continuam honestos.
9. Testes, build, lint, typecheck e QA passam.
10. Producao e validada sem nova cobranca real.

