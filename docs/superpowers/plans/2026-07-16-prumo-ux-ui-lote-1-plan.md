# Prumo UX/UI - Plano de implementacao do Lote 1

**Spec:** [2026-07-16-prumo-ux-ui-convergencia-operacional-design.md](../specs/2026-07-16-prumo-ux-ui-convergencia-operacional-design.md)

## Objetivo

Convergir a fundacao responsiva e os padroes estruturais do app sem alterar regras de negocio, dados, autenticacao, cobranca ou PDFs.

## Tarefa 1 - Primitivas estruturais

- Criar `PageContainer` com gutters, espacamento vertical e larguras semanticas.
- Ajustar `PageHeader` para a escala tipografica aprovada e acoes responsivas.
- Manter `EmptyState` compacto, estavel e acessivel.
- Criar um shell reutilizavel de loading para preservar geometria entre rotas.

## Tarefa 2 - Shell e navegacao

- Revisar `AppLayout`, sidebar, topbar e bottom navigation.
- Garantir safe areas, largura de menu mobile e espaco de conteudo.
- Preservar os destinos e a regra atual de item ativo.
- Nao alterar logout, resolucao de empresa ou redirecionamentos.

## Tarefa 3 - Migracao dos containers

- Migrar dashboard e listas para `PageContainer`.
- Migrar formularios, detalhes e configuracoes para larguras semanticas do mesmo componente.
- Migrar loadings para o mesmo container das telas finais.
- Deixar planos e checkout para o lote de monetizacao, salvo correcao estrutural necessaria.

## Tarefa 4 - Validacao

- Rodar `npm run lint`.
- Rodar `npm run typecheck`.
- Rodar `npm test`.
- Rodar `npm run build`.
- Fazer QA no app real em 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900.
- Conferir zoom, overflow, safe areas, menu, navegacao, foco e estados de loading.

## Invariantes

- Nenhuma server action, query, route handler ou migration sera alterada.
- Nenhum texto de plano, preco ou promessa comercial sera alterado.
- Nenhuma regra de permissao ou bloqueio sera alterada.
- O lote termina em commit proprio e deve permanecer reversivel.

## Criterios de aceite

1. Paginas internas usam gutters e espacamento vertical consistentes.
2. Telas mobile nao abrem com zoom nem overflow horizontal.
3. Topbar, menu e bottom navigation respeitam safe areas e nao cobrem conteudo.
4. Cabecalhos e loadings preservam geometria estavel.
5. Todos os gates automatizados passam.
