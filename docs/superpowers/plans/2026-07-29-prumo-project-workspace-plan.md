# Prumo UX/UI - Plano de implementação do workspace de projeto

**Spec:** [2026-07-29-prumo-project-workspace-design.md](../specs/2026-07-29-prumo-project-workspace-design.md)

## Objetivo

Transformar o detalhe de projeto em um workspace por áreas, mobile-first,
endereçável por URL e carregado sob demanda, preservando todas as regras de
projeto, briefing, entregas, faturamento, planos e segurança.

## Tarefa 1 - Modelo puro das áreas

- Criar `web/src/app/app/obras/[id]/project-workspace.ts`.
- Declarar os conjuntos de áreas para arquitetura/interiores e
  construção/engenharia.
- Implementar tipos e funções puras para validar `view`, decidir a área inicial,
  mapear hashes antigos e preservar parâmetros compatíveis.
- Priorizar Gestão quando `cobranca=atencao` existir sem uma área explícita.
- Adicionar `project-workspace.test.ts` com segmentos, query inválida, cobrança,
  hashes legados e construção de URL.
- Não importar React, navegador ou Supabase nesse módulo.

## Tarefa 2 - Consultas por área

- Refatorar `web/src/lib/queries/projects.ts` para separar a base do projeto das
  relações operacionais.
- Reutilizar `getProject` para cabeçalho, acesso e metadados.
- Criar consultas tipadas para etapas, resumo e Gestão, mantendo filtro de tenant
  aplicado pelo Supabase/RLS.
- Carregar diário com o limite atual, contagem total, fotos e ordenação atual.
- Preservar cálculo de receita aprovada, custos, margem, cobrança, ponto e token
  público sem mover cálculos confiáveis para o cliente.
- Reutilizar as consultas existentes de briefing, ambientes e entregas.
- Remover `getProjectWithRelations` somente depois que nenhum consumidor
  depender dele.
- Adicionar testes puros para agregados extraídos durante a refatoração.

## Tarefa 3 - Orquestração da página

- Atualizar `web/src/app/app/obras/[id]/page.tsx` para receber `view`.
- Buscar projeto e empresa primeiro, resolver as áreas permitidas e carregar
  somente os dados da área ativa.
- Usar `getProject` em `generateMetadata`.
- Manter `ProjectHeader` estável entre áreas.
- Mostrar `StatusSuggestion` apenas no Resumo ou em Etapas, conforme o contexto.
- Criar uma fronteira de renderização clara para cada área.
- Manter `cobranca=atencao`, modo demo, projeto bloqueado e vocabulário por
  segmento.

## Tarefa 4 - Navegação real do workspace

- Substituir `ProjectSectionNav` por `ProjectWorkspaceNav`.
- Renderizar links com abas compactas no desktop e seletor de 44 px no mobile.
- Preservar query e histórico do navegador.
- Converter hashes antigos na primeira montagem sem criar loops.
- Restaurar o hash interno de Cobrança, Diário, Custos ou Equipe depois de abrir
  Gestão.
- Manter navegação sticky sem cobrir topbar, conteúdo ou bottom navigation.
- Adicionar o evento `project_workspace_view_changed` sem dados pessoais.
- Atualizar a lista tipada de eventos e seus testes.

## Tarefa 5 - Resumo compartilhado

- Criar `ProjectWorkspaceOverview` para todos os segmentos.
- Reutilizar a lógica útil de `ArchitectureProjectOverview` e eliminar
  hierarquias duplicadas.
- Exibir próxima ação, progresso, prazo, valor, situação financeira e etapa atual
  com dados reais.
- Incluir briefing, ambientes e entregas somente em arquitetura/interiores.
- Criar atalhos para a área que resolve cada pendência.
- Manter valores fictícios e proteção explícita em workspaces demo.
- Usar faixa compacta de métricas, números tabulares e nenhuma superfície
  aninhada.

## Tarefa 6 - Composição das áreas

- Compor Briefing, Ambientes, Etapas e Entregas sem alterar seus contratos de
  negócio.
- Compor Gestão com Cobrança, Diário, Custos, Equipe e link público.
- Criar navegação interna curta em Gestão para as quatro seções operacionais.
- Preservar a grade Diário/Custos no desktop e coluna única no mobile.
- Atualizar links do centro de demonstração e atalhos internos para `view`.
- Manter estados vazios compactos e uma ação principal por contexto.

## Tarefa 7 - Proteção de rascunho

- Preservar o `sessionStorage` existente do texto do diário.
- Integrar `ProtectedFormNavigation` ao `DiaryComposer` quando houver fotos
  selecionadas ou upload em andamento.
- Limpar a proteção após publicar ou remover todas as fotos.
- Confirmar que troca por aba, seletor, voltar, avançar e fechamento não perdem
  arquivos silenciosamente.
- Adicionar indicação discreta quando o texto do diário for restaurado.
- Cobrir o comportamento em E2E sem persistir conteúdo do cliente em analytics.

## Tarefa 8 - Compatibilidade, QA e publicação

- Criar E2E autenticado para todas as áreas disponíveis em arquitetura.
- Validar o conjunto reduzido de áreas em construção e engenharia.
- Validar URL copiada, reload, voltar/avançar, query inválida e hash legado.
- Confirmar que atenção de cobrança abre Gestão e mantém o destaque.
- Confirmar que o workspace demo não renderiza Pix, boleto ou link real.
- Executar as jornadas de briefing, ambientes, etapas, entregas e financeiro.
- Verificar foco, teclado, console e overflow em 375, 390, 768 e 1440 px.
- Capturar screenshots reais, sem mockups.
- Rodar lint, typecheck, testes, auditoria de produção e build.
- Revisar diffs por etapa, criar commits pequenos, publicar, acompanhar Vercel e
  executar smoke no domínio principal.

## Ordem de commits

1. `feat: add project workspace routing model`
2. `refactor: split project workspace queries`
3. `feat: add project workspace navigation`
4. `feat: add project workspace overview`
5. `feat: compose project workspace views`
6. `fix: protect project workspace drafts`
7. `test: validate project workspace journeys`

Commits podem ser combinados apenas quando a separação produzir código
intermediário que não compile. O arquivo
`docs/CHECKLIST_LANCAMENTO.md` permanece fora de todos os commits.

## Verificação incremental

1. Testes do modelo puro antes de integrar React.
2. Typecheck e testes de agregados depois da divisão de consultas.
3. Lint e build depois da orquestração da página.
4. E2E de navegação antes de alterar o Resumo.
5. E2E funcional depois de compor todas as áreas.
6. QA visual nos quatro viewports.
7. Suite completa, auditoria, deploy e smoke final.

## Invariantes

- Nenhuma migration ou política RLS será alterada.
- Nenhuma consulta aceitará `company_id` fornecida pelo cliente.
- As ações existentes continuam validando projeto, empresa, plano e status no
  servidor.
- Totais financeiros não serão recalculados no navegador.
- Asaas, checkout, webhook, PDF e links públicos mantêm seus contratos.
- Demo continua bloqueada no servidor e na interface.
- Briefing e versões publicadas permanecem imutáveis quando já concluídos.
- A troca de área nunca apaga silenciosamente texto ou fotos pendentes.

## Critérios de aceite

1. O projeto abre em Resumo e não renderiza todos os módulos de uma vez.
2. Qualquer área permitida fica acessível em uma ação.
3. URL, reload e histórico restauram a área correta.
4. Links antigos continuam levando ao conteúdo esperado.
5. Somente dados necessários para a área ativa são consultados e renderizados.
6. Rascunho textual é restaurado e fotos pendentes recebem proteção de saída.
7. Mobile não apresenta zoom inicial, overflow ou navegação cobrindo conteúdo.
8. Demo não expõe nem executa cobranças reais.
9. Fluxos de briefing, entrega, financeiro, PDF e planos continuam verdes.
10. Gates locais, E2E, deploy e smoke de produção passam integralmente.
