# Prumo UX/UI - Plano de implementacao do Lote 2

**Spec:** [2026-07-16-prumo-ux-ui-convergencia-operacional-design.md](../specs/2026-07-16-prumo-ux-ui-convergencia-operacional-design.md)

## Objetivo

Fechar as inconsistencias restantes nas telas de operacao diaria sem reconstruir o refinamento implementado em 13 de julho. O lote melhora descoberta, comparacao e velocidade de uso em Inicio, Orcamentos, Obras, Clientes, Catalogo e Financeiro.

## Tarefa 1 - Primitivas operacionais

- Criar toolbar compartilhada para busca, acoes, filtros e contagem.
- Criar estado vazio compacto para buscas sem resultado.
- Criar controle responsivo de status: select no mobile e botoes no desktop.
- Criar faixa e tile de metricas compartilhados entre Inicio e Financeiro.
- Criar normalizacao de busca tolerante a maiusculas e acentos, com testes unitarios.

## Tarefa 2 - Obras

- Extrair a lista para um componente cliente focado.
- Adicionar busca por obra e cliente.
- Adicionar filtro por status com contagens.
- Refletir busca e status na URL.
- Manter linhas compactas, valores, datas e links atuais.
- Adicionar testes unitarios para filtro, contagem e parametros invalidos.

## Tarefa 3 - Orcamentos, Clientes e Catalogo

- Migrar as toolbars duplicadas para o componente compartilhado.
- Preservar filtros, dialogos, links e acoes atuais.
- Tornar buscas tolerantes a acentos.
- Padronizar limpeza de busca e estado sem resultado.
- Manter alvos de toque de 44 px e feedback acessivel.

## Tarefa 4 - Inicio e Financeiro

- Substituir tiles duplicados pela primitiva compartilhada.
- Preservar calculos, consultas e textos atuais.
- Normalizar hierarquia, icones e numeros tabulares.
- Corrigir nomes acessiveis de icones decorativos tocados pelo lote.

## Tarefa 5 - Validacao

- Rodar lint, typecheck, testes unitarios e build.
- Rodar E2E responsivo existente e ampliar cobertura quando necessario.
- Fazer QA visual com dados preenchidos em 375, 390, 768 e 1440 px.
- Conferir overflow, URL dos filtros, teclado, foco, estados vazios e fixed navigation.

## Invariantes

- Nenhuma query, server action, route handler ou migration sera alterada.
- Nenhum calculo financeiro sera alterado.
- Nenhuma regra de plano, cobranca, autenticacao ou PDF sera alterada.
- A filtragem atua apenas sobre dados ja carregados para a pagina.
- Cada mudanca deve permanecer reversivel no commit do lote.

## Criterios de aceite

1. As quatro listas usam a mesma estrutura de busca e feedback.
2. Obras pode ser localizada por texto e status no mobile e desktop.
3. A URL preserva os filtros de Orcamentos e Obras.
4. Pesquisas sem acento encontram textos cadastrados com acento.
5. Inicio e Financeiro usam a mesma faixa de metricas.
6. Nao ha overflow ou regressao funcional nas viewports de referencia.
7. Todos os gates automatizados passam.
