# Prumo UX/UI - Plano de implementacao do Lote 3A

**Spec:** [2026-07-16-prumo-ux-ui-lote-3a-detalhe-obra-design.md](../specs/2026-07-16-prumo-ux-ui-lote-3a-detalhe-obra-design.md)

## Objetivo

Reduzir o esforco para localizar e operar as areas do detalhe da obra sem esconder funcionalidades e sem alterar dados, calculos, cobranca, status ou server actions.

## Tarefa 1 - Navegacao local

- Criar `ProjectSectionNav` como componente cliente isolado.
- Definir destinos tipados para Etapas, Cobranca, Diario, Custos e Equipe.
- Usar select de 44 px no mobile e links compactos no desktop.
- Atualizar o hash da URL e o estado ativo sem consulta ao servidor.
- Respeitar `prefers-reduced-motion` ao rolar para o destino.
- Tratar acesso direto por hash e navegacao de voltar/avancar.

## Tarefa 2 - Integracao no detalhe

- Inserir a navegacao depois do cabecalho e da sugestao contextual.
- Adicionar `id` e `scroll-margin` aos cinco destinos.
- Preservar a ordem atual das secoes e a grade de Diario/Custos.
- Manter o link publico como recurso secundario no final.
- Garantir coexistencia da query `cobranca=atencao` com hashes.

## Tarefa 3 - Cabecalho e acessibilidade

- Aumentar a area de toque do retorno para Obras.
- Normalizar quebra responsiva de titulo, metadados e acao de status.
- Marcar icones decorativos com `aria-hidden`.
- Manter status com texto visivel, foco e contraste.
- Corrigir apenas inconsistencias diretamente tocadas pelo lote.

## Tarefa 4 - Teste E2E

- Criar workspace temporario e carregar o kit demonstrativo.
- Abrir a obra gerada e validar os cinco destinos.
- Confirmar hash, `aria-current`, foco e destino visivel.
- Verificar overflow em 375, 390, 768 e 1440 px.
- Capturar evidencias visuais do produto real.
- Excluir empresa e usuario de QA no encerramento.

## Tarefa 5 - Gates e publicacao

- Rodar typecheck, lint, testes unitarios e build.
- Revisar o diff contra as invariantes funcionais.
- Rodar o E2E novo e jornadas criticas existentes.
- Fazer QA visual nas quatro larguras de referencia.
- Commitar o lote isoladamente, publicar e acompanhar GitHub CI e Vercel.
- Executar smoke test no dominio principal.

## Invariantes

- Nenhuma query, server action, route handler ou migration sera alterada.
- Nenhum payload do Supabase ou Asaas sera alterado.
- Nenhum calculo financeiro, de progresso, custo ou horas sera alterado.
- Nenhum bloqueio de plano ou permissao sera alterado.
- Nenhum modulo da obra sera ocultado atras de abas.
- O link publico e a query de atencao de cobranca permanecem validos.

## Criterios de aceite

1. Qualquer secao da obra pode ser alcancada por um controle claro.
2. O hash identifica o destino e funciona com voltar/avancar.
3. A navegacao nao cobre conteudo nem conflita com topbar ou bottom navigation.
4. As cinco secoes continuam visiveis e funcionais na mesma pagina.
5. Nao ha overflow nas viewports de referencia.
6. Pagamento, baixa, status, calculos, permissoes e link publico permanecem intactos.
7. Gates locais, E2E, CI e deploy passam integralmente.
