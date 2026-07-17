# Prumo UX/UI - Plano de implementacao do Lote 3B

**Spec:** [2026-07-17-prumo-ux-ui-lote-3b-editor-orcamento-design.md](../specs/2026-07-17-prumo-ux-ui-lote-3b-editor-orcamento-design.md)

## Objetivo

Transformar o editor de orcamento em um fluxo comercial protegido, previsivel e mobile-first, preservando a persistencia atomica, o envio pelo WhatsApp e todas as regras atuais do produto.

## Tarefa 1 - Modelo puro do rascunho

- Criar `quote-draft.ts` com os tipos editaveis e funcoes puras.
- Normalizar titulo, textos, unidade e itens antes de comparar ou salvar.
- Excluir linhas vazias, chaves locais e estado de catalogo do payload persistivel.
- Produzir uma assinatura estavel para detectar alteracoes reais.
- Validar limites atuais sem substituir a validacao Zod do servidor.
- Mover `ItemDraft` para esse modulo e atualizar consumidores.
- Adicionar `quote-draft.test.ts` para rascunho vazio, normalizacao, ordem, limites e dirty state.

## Tarefa 2 - Protecao de navegacao

- Criar uma unidade cliente isolada para proteger saidas quando `isDirty` for verdadeiro.
- Registrar e remover `beforeunload` conforme o estado do rascunho.
- Interceptar apenas links internos que realmente troquem de rota.
- Preservar links externos, downloads, alvos especiais, modificadores e ancoras locais.
- Exibir dialog com `Continuar editando` e `Sair sem salvar`.
- Tratar voltar/avancar sem loop e cobrir o comportamento no E2E.
- Liberar uma unica navegacao depois da confirmacao.

## Tarefa 3 - Ciclo de salvamento no `QuoteEditor`

- Criar a referencia inicial confirmada pelo servidor.
- Calcular `isDirty` a partir do payload normalizado.
- Implementar estados `saved`, `dirty`, `saving` e `error`.
- Permitir salvar zero itens preenchidos.
- Atualizar a referencia somente depois do sucesso da server action.
- Manter dirty e erro quando o servidor rejeitar a operacao.
- Evitar save redundante antes do envio quando nada mudou.
- Limpar erro de campo quando o usuario corrigir seu valor.
- Focar o primeiro erro depois de uma tentativa invalida.
- Manter `updateQuoteAction`, RPC, payload financeiro e `router.refresh` atuais.

## Tarefa 4 - Composicao e feedback

- Extrair a conferencia de envio para um componente compacto.
- Extrair a barra sticky de salvamento como componente de apresentacao.
- Mostrar estado, total, proximo bloqueio e acoes sem duplicacao textual.
- Adicionar `aria-live`, `aria-invalid` e `aria-describedby` onde aplicavel.
- Adicionar `name`, `autocomplete`, limites e nomes acessiveis aos campos.
- Refinar o retorno para a lista com alvo de toque e foco consistentes.
- Manter superfices com raio maximo de 8 px e densidade media.
- Respeitar bottom navigation, safe area e sidebar.

## Tarefa 5 - Itens e desfazer

- Refinar a grade mobile para descricao, quantidade/unidade, preco/total e acoes.
- Preservar a tabela densa no desktop.
- Renderizar o `datalist` de unidades uma unica vez no editor.
- Marcar icones decorativos e manter nomes nos botoes de icone.
- Implementar remocao de item preenchido com faixa `Desfazer`.
- Restaurar a ultima remocao na posicao original.
- Manter uma linha vazia quando a lista persistivel ficar vazia.
- Limpar a possibilidade de desfazer depois de outro delete ou save bem-sucedido.

## Tarefa 6 - Criacao inicial

- Refinar a tela e o formulario de novo orcamento sem mudar o fluxo de duas etapas.
- Mostrar erros de cliente e titulo junto aos campos.
- Alinhar nomes, autocomplete, loading e alvos de toque ao editor.
- Preservar validade automatica, limite do Gratis, analytics e redirect.
- Manter o estado vazio que direciona ao cadastro do primeiro cliente.

## Tarefa 7 - E2E, QA e publicacao

- Criar E2E isolado para o editor protegido com conta temporaria.
- Validar dirty state, cancelamento e confirmacao de navegacao.
- Salvar rascunho sem itens e confirmar persistencia depois do reload.
- Validar adicionar, reordenar, remover, desfazer e salvar itens.
- Confirmar que o envio continua bloqueado ate a prontidao completa.
- Rodar a jornada principal existente de envio, aprovacao e conversao em obra.
- Verificar erros de console e overflow em 375, 390, 768 e 1440 px.
- Capturar screenshots reais dos estados relevantes.
- Rodar typecheck, lint, testes e build.
- Revisar o diff, commitar, publicar, acompanhar CI/Vercel e executar smoke no dominio principal.

## Ordem de verificacao

1. Testes unitarios do modelo do rascunho.
2. Typecheck e lint depois das extracoes.
3. Build de producao.
4. E2E novo em desktop com resize dos quatro viewports.
5. Core flow existente em desktop e mobile.
6. QA visual das capturas reais.
7. CI com Supabase isolado e smoke de producao.

## Invariantes

- Nenhuma migration, RLS, query ou server action sera alterada.
- `replace_quote_items` continua sendo a persistencia atomica do editor.
- Nenhum total persistido sera calculado pelo cliente.
- Status e imutabilidade de orcamentos enviados permanecem no servidor.
- Link publico, PDF, WhatsApp e aprovacao preservam os contratos atuais.
- Planos, limites, checkout e Asaas nao serao alterados.
- O editor nao gravara em background nem usara armazenamento local.

## Criterios de aceite

1. O editor mostra corretamente salvo, alterado, salvando e erro.
2. Um rascunho sem itens pode ser salvo, mas nao enviado.
3. Navegacoes internas e fechamento protegem alteracoes pendentes.
4. Erros aparecem no campo correto e o primeiro recebe foco.
5. A ultima remocao preenchida pode ser desfeita antes de salvar.
6. Mobile nao apresenta zoom inicial, overflow ou barra cobrindo conteudo.
7. A jornada de criar, precificar, enviar, aprovar e converter continua verde.
8. Gates locais, E2E, CI, deploy e smoke passam integralmente.
