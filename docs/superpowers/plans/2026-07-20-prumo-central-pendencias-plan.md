# Prumo - Central de Pendencias - Plano de implementacao

**Spec:** [2026-07-20-prumo-central-pendencias-design.md](../specs/2026-07-20-prumo-central-pendencias-design.md)

## Objetivo

Evoluir o bloco de proximas acoes do Inicio para uma fila operacional objetiva,
com resumo compacto e pagina completa. O recurso usa somente dados autorizados
ja existentes e nao altera banco, RLS, planos, pagamento ou PDFs.

## Ordem de execucao

1. fechar o dominio e suas regras com testes puros;
2. criar a consulta agregadora e analytics privados;
3. integrar o resumo ao Inicio;
4. construir a pagina completa e filtros por URL;
5. executar gates, QA real e rollout.

## Lote 1 - Dominio deterministico

### Tarefa 1 - Tipos e regras puras

- criar o modelo normalizado de pendencia;
- aceitar estruturas minimas de orcamento, obra e cobranca;
- detectar cobranca vencida por status ou data;
- detectar obra aberta com prazo vencido;
- detectar entrega aprovada sem cobranca de saldo;
- detectar orcamento aprovado sem obra;
- detectar proposta expirada sem decisao;
- nao gerar JSX nem depender de Supabase no dominio.

Arquivos previstos:

- `web/src/lib/operational-pendencies-core.ts`
- `web/src/lib/operational-pendencies-core.test.ts`

### Tarefa 2 - Ordenacao e ausencia de falsos positivos

- ordenar por prioridade, data mais antiga e identificador;
- garantir resultado estavel para entradas em ordens diferentes;
- nao mutar arrays ou objetos recebidos;
- cobrir datas no limite do dia brasileiro;
- excluir cobrancas futuras, recebidas, confirmadas ou canceladas;
- excluir obras concluidas e canceladas;
- excluir aprovado que ja virou obra;
- excluir entrega que ja possui cobranca de saldo.

Checkpoint:

`test: define objective Prumo pendencies`

## Lote 2 - Dados e analytics

### Tarefa 3 - Agregador server-side

- reutilizar consultas tenant-scoped existentes;
- buscar orcamentos, obras e cobrancas em paralelo;
- passar `todayBR()` explicitamente ao dominio;
- retornar lista completa e contagens derivadas;
- nao esconder falha parcial de uma das consultas;
- evitar nova migration e service role.

Arquivos previstos:

- `web/src/lib/queries/operational-pendencies.ts`
- consultas existentes somente se o contrato exigir campos adicionais.

### Tarefa 4 - Eventos privados

- adicionar `pendency_center_opened` e `pendency_clicked`;
- abertura envia categoria conhecida e contagem limitada;
- clique envia somente tipo, categoria e prioridade;
- nunca enviar ID, nome, titulo, numero, data ou valor;
- provar que os eventos nao viram conversao Meta.

Arquivos previstos:

- `web/src/lib/product-event-names.ts`
- `web/src/lib/meta-events.test.ts`
- `web/src/app/api/product-events/route.test.ts`
- `web/src/components/pendency-tracking.tsx`

Checkpoint:

`feat: add Prumo pendency domain`

## Lote 3 - Resumo no Inicio

### Tarefa 5 - Substituir proximas acoes operacionais

- manter ativacao inicial e dados de exemplo separados;
- remover o builder local de sugestoes que mistura onboarding e operacao;
- mostrar total e ate 5 pendencias reais;
- mostrar prioridade por texto, icone e tom visual;
- exibir data ou valor apenas na interface, nunca em analytics;
- incluir `Ver todas` quando houver itens;
- manter estado positivo compacto sem pendencias.

Arquivos previstos:

- `web/src/app/app/page.tsx`
- `web/src/components/pendencies/pendency-summary.tsx`
- `web/src/components/pendencies/pendency-row.tsx`

### Tarefa 6 - Acessibilidade e densidade

- manter linhas com alvo minimo de 44 px;
- usar links para navegacao e foco visivel;
- garantir quebra de texto em 375 px;
- nao usar cor como unico indicador;
- limitar descricoes para preservar leitura rapida;
- preservar metricas e listas recentes atuais.

Checkpoint:

`feat: surface objective pendencies on dashboard`

## Lote 4 - Pagina completa

### Tarefa 7 - Rota autenticada server-first

- criar `/app/pendencias` no shell existente;
- validar `searchParams.categoria` no servidor;
- usar `all` para valor ausente ou invalido;
- exibir contagem total e por categoria;
- manter a ordenacao produzida pelo dominio;
- incluir estado vazio geral e por filtro;
- oferecer ajuda contextual sem criar card promocional.

Arquivos previstos:

- `web/src/app/app/pendencias/page.tsx`
- `web/src/components/pendencies/pendency-filters.tsx`
- componentes compartilhados do lote anterior.

### Tarefa 8 - Navegacao e deep links

- ligar `Ver todas` do Inicio a `/app/pendencias`;
- refletir filtro em `?categoria=quotes|projects|billing`;
- usar links reais para permitir abrir em nova aba;
- navegar cada pendencia para a entidade correta;
- nao adicionar item fixo a sidebar ou bottom nav neste primeiro corte.

Checkpoint:

`feat: add complete Prumo pendency center`

## Lote 5 - Testes e rollout

### Tarefa 9 - E2E

- criar dados temporarios com pendencias objetivas quando o contrato de teste
  permitir;
- validar resumo limitado a 5 itens;
- validar pagina completa e filtros por URL;
- validar fallback de filtro invalido;
- validar destino de orcamento, obra e cobranca;
- validar payload de analytics sem campos proibidos;
- limpar toda conta e empresa de teste.

Arquivos previstos:

- `web/e2e/browser/operational-pendencies.spec.ts`
- `web/e2e/browser/responsive-shell.spec.ts` somente para integracao visual.

### Tarefa 10 - Gates locais

- testes focados do dominio e analytics;
- `npm run typecheck`;
- `npm run lint`;
- `npm test`;
- `npm run build`;
- `npm audit --audit-level=high`;
- Playwright desktop e mobile;
- `git diff --check`;
- confirmar que `docs/CHECKLIST_LANCAMENTO.md` permanece fora dos commits.

### Tarefa 11 - QA visual real

- testar o app real, sem mockup;
- verificar 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900;
- conferir prioridade, filtros, estado vazio, foco e textos longos;
- confirmar ausencia de overflow, sobreposicao e erros de console;
- usar somente dados de teste.

### Tarefa 12 - Publicacao

- enviar `main` apenas com gates verdes;
- acompanhar GitHub Actions ate estado terminal;
- acompanhar Vercel ate `Ready`;
- confirmar alias `https://gestao-empreita.vercel.app`;
- executar smoke de Inicio e `/app/pendencias` em producao sem alterar dados.

## Invariantes

- Pendencia representa estado real, nao lembrete arbitrario.
- Resolver a entidade remove o item automaticamente.
- Empresa vazia nao recebe alerta artificial.
- Todos os dados continuam tenant-scoped e protegidos por RLS.
- Analytics nao recebe PII, valor, ID ou texto operacional.
- Nenhuma migration, regra de plano, cobranca, login ou PDF muda.
- O checklist modificado pelo usuario nao entra nos commits.

## Criterios de pronto

1. As 5 regras objetivas tem testes positivos e negativos.
2. Inicio mostra no maximo 5 itens e permanece compacto.
3. `/app/pendencias` lista tudo e filtra por URL.
4. Prioridade e compreensivel sem depender apenas de cor.
5. Cliques chegam ao orcamento ou obra correta.
6. Eventos nao expõem conteudo operacional nem viram conversao Meta.
7. Mobile e desktop passam sem overflow ou erro de console.
8. Testes, build, CI, deploy e smoke passam.

