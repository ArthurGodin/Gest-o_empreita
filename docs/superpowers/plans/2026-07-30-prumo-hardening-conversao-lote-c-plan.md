# Prumo - Plano de implementacao do hardening e conversao basica

**Spec:** [2026-07-29-prumo-hardening-conversao-lote-c-design.md](../specs/2026-07-29-prumo-hardening-conversao-lote-c-design.md)

## Objetivo

Fechar os riscos altos encontrados na auditoria de producao e entregar um ganho
comercial pequeno, mensuravel e reversivel, sem alterar planos, regras de
faturamento ou o produto principal.

## Premissas de execucao

- Trabalhar sobre `main` em commits pequenos.
- Manter `docs/CHECKLIST_LANCAMENTO.md` fora de todos os commits.
- Escrever ou atualizar testes antes de concluir cada comportamento.
- Nao criar cobranca Asaas real durante testes ou QA.
- Nao publicar CPF, CNPJ, endereco ou segredo sem configuracao explicita.
- Nao ativar Meta sem credenciais e consentimento.
- Nao promover CSP para bloqueio neste lote.
- Preservar RLS, webhooks, PDFs, planos e workspace demo.

## Tarefa 1 - Recuperar verificacao e restore de backup

### Arquivos

- Modificar `web/scripts/verify-backup.ts`.
- Modificar `web/src/lib/operations/backup-verification-core.ts`.
- Modificar `web/src/lib/operations/backup-verification-core.test.ts`.
- Modificar `ops/backup-supabase.ps1`.
- Modificar `ops/test-restore-supabase.ps1`.
- Criar `ops/storage-buckets.json`.
- Modificar `docs/operacao-backup-restauracao.md`.
- Modificar `web/package.json` apenas se o comando precisar de ajuste.

### Implementacao

1. Adicionar casos de teste para pacote incompleto, inventario de Storage,
   checksum invalido e limpeza.
2. Encapsular o script em `main()` assincrona com `catch` final e `exitCode`.
3. Preservar `finally` para apagar temporarios em sucesso e falha.
4. Criar um inventario canonico e versionado com todos os buckets, incluindo
   visibilidade, limite e MIME types quando aplicaveis.
5. Fazer o backup comparar os buckets remotos com o inventario, recusar bucket
   desconhecido e incluir `storage-buckets.json` no pacote.
6. Subir o formato do pacote para v3 e manter verificacao explicita de v2 como
   legado sem metadados completos de Storage.
7. Fazer o inventario descriptografado exigir os arquivos de banco, a pasta
   `storage` e, no formato v3, `storage-buckets.json`.
8. Estender o ensaio PowerShell com restauracao de configuracao e objetos:
   - recriar/upsertar buckets a partir do inventario antes do upload;
   - usar `supabase storage cp --local` para destino local;
   - usar `--linked` somente com confirmacao de projeto remoto descartavel;
   - recusar o project ref de producao;
   - percorrer todas as pastas de bucket encontradas;
   - tratar `sinapi-sources` e `project-deliverables` como qualquer outro bucket.
9. Marcar ensaio sem Storage como parcial, nunca como restore completo.
10. Registrar evidencia apenas com contagens, duracao, destino local/remoto e
   resultado.
11. Atualizar o runbook para usar o inventario, sem lista fixa de buckets.

### Verificacao

- `npm run test -- src/lib/operations/backup-verification-core.test.ts`
- `npm run backup:verify -- --help` ou equivalente nao destrutivo.
- Teste com pacote ficticio invalido fora do repositorio.
- `git diff --check`.

### Commit

`fix: restore backup verification and storage coverage`

## Tarefa 2 - Corrigir autorizacao de foto publica

### Arquivos

- Modificar `web/src/app/q/[token]/photo/[id]/route.ts`.
- Criar `web/src/app/q/[token]/photo/[id]/route.test.ts`.

### Implementacao

1. Criar mocks de foto, propostas e assinatura de URL.
2. Cobrir:
   - foto valida com uma proposta aprovada;
   - duas ou mais propostas no mesmo projeto;
   - token incorreto;
   - proposta em estado nao publico;
   - foto e arquivo ausentes;
   - erro de banco.
3. Buscar a foto pelo UUID.
4. Buscar a colecao minima de propostas publicas ligadas ao projeto.
5. Autorizar quando um token aprovado corresponder em tempo constante.
6. Retornar 404 uniforme em toda negacao.
7. Criar URL assinada somente depois da autorizacao.

### Verificacao

- `npm run test -- "src/app/q/[token]/photo/[id]/route.test.ts"`
- Typecheck.
- Smoke de uma foto publica existente em ambiente descartavel.

### Commit

`fix: harden public diary photo access`

## Tarefa 3 - Tornar exportacao contabil integra e contextual

### Arquivos

- Modificar `web/src/app/app/financeiro/actions.ts`.
- Modificar `web/src/lib/finance-export-csv.ts`.
- Modificar `web/src/lib/finance-export-csv.test.ts`.
- Modificar `web/src/app/app/financeiro/export-button.tsx` se a mensagem de erro
  precisar ser ajustada.

### Implementacao

1. Adicionar testes para todas as categorias e vocabulario por segmento.
2. Adicionar testes de erro parcial de receitas e custos no nivel da action.
3. Consultar receitas e custos com `Promise.all`.
4. Verificar os dois objetos `error` antes de gerar o CSV.
5. Registrar falha sanitizada e retornar erro acionavel.
6. Passar o segmento profissional ao gerador.
7. Mapear codigos internos para rotulos exibidos no app.
8. Preservar BOM, delimitador, aspas, datas e centavos.

### Verificacao

- Testes do CSV e da action.
- Abrir CSV de arquitetura e execucao no Google Sheets/Excel mobile.
- Confirmar acentos, categoria e cabecalho.

### Commit

`fix: protect accounting export integrity`

## Tarefa 4 - Limitar duracao das chamadas Asaas

### Arquivos

- Modificar `web/src/lib/asaas/client.ts`.
- Modificar ou criar `web/src/lib/asaas/client.test.ts`.
- Modificar `web/src/lib/log.ts` somente se for necessario traduzir timeout.

### Implementacao

1. Cobrir resposta normal, timeout e cancelamento fornecido pelo chamador.
2. Definir timeout padrao centralizado.
3. Combinar timeout e `init.signal` sem perder nenhum deles.
4. Traduzir `AbortError` de timeout para erro tipado e seguro.
5. Nao adicionar retry automatico em POST, PUT ou DELETE.
6. Preservar parsing de erro Asaas e sanitizacao atual.
7. Confirmar que lock de checkout e webhook nao mudaram.

### Verificacao

- Testes do cliente Asaas.
- Testes de billing e SaaS existentes.
- Typecheck e lint.
- QA de checkout demo; em producao, parar antes de criar nova cobranca.

### Commit

`fix: bound Asaas request duration`

## Tarefa 5 - Aposentar ingestao anonima de eventos

### Arquivos

- Modificar `web/src/lib/product-analytics.ts`.
- Remover `web/src/app/api/product-events/route.ts`.
- Remover ou substituir `web/src/app/api/product-events/route.test.ts`.
- Modificar testes de analytics relacionados.

### Implementacao

1. Testar que eventos continuam chegando ao `@vercel/analytics`.
2. Testar que error boundaries nao chamam API interna nem enviam alerta.
3. Remover `sendStructuredEvent`.
4. Manter analytics e Pixel como melhor esforco.
5. Remover a rota publica e seus efeitos de alerta/CAPI.
6. Confirmar que clientes antigos recebem 404 sem impacto funcional.
7. Atualizar diagnostico para nao prometer logs `product_event`.

### Verificacao

- Testes de analytics.
- Busca global por `/api/product-events`.
- E2E de erro controlado sem alerta.
- Console limpo na versao atual do cliente.

### Commit

`fix: retire unsafe anonymous event ingestion`

## Tarefa 6 - Adicionar consentimento e conversoes confiaveis

### Arquivos

- Criar `web/src/lib/marketing-consent.ts`.
- Criar `web/src/lib/marketing-consent.test.ts`.
- Criar `web/src/components/marketing-consent-banner.tsx`.
- Cobrir a apresentacao do componente por helper puro e E2E, sem adicionar uma
  biblioteca de testes de UI apenas para este lote.
- Modificar `web/src/app/layout.tsx`.
- Modificar `web/src/lib/product-analytics.ts`.
- Modificar `web/src/lib/meta-conversions.ts`.
- Modificar `web/src/lib/meta-events.ts` e testes.
- Modificar cadastro, onboarding e checkout para compartilhar `eventId`.
- Modificar `web/src/app/privacidade/page.tsx`.
- Modificar `.env.local.example` e `web/PRODUCAO.md`.

### Implementacao

1. Implementar parse, serializacao e expiracao do consentimento versionado.
2. Exibir barra compacta apenas quando Meta estiver configurada e nao houver
   escolha.
3. Oferecer `Somente necessarios` e `Aceitar medicao` com destaque equivalente.
4. Permitir rever a escolha na pagina de privacidade.
5. Carregar o Pixel somente em `granted`.
6. Permitir `eventId` fornecido ao tracking cliente.
7. Gerar IDs no servidor para cadastro concluido, onboarding concluido e
   checkout real gerado.
8. Reutilizar o ID no Pixel e CAPI para deduplicacao.
9. Ler cookies Meta/consentimento da requisicao sem enviar email, telefone ou
   documento.
10. Manter `Purchase` fora do lote e documentar a limitacao.
11. Manter toda a aplicacao funcional em `denied` ou sem credenciais.

### Verificacao

- Testes de consentimento, Pixel gate, mapeamento e deduplicacao.
- QA aceitando, recusando e revendo escolha.
- Network: nenhum request Meta antes do aceite.
- Cadastro, onboarding e checkout continuam funcionando sem Meta.

### Commit

`feat: gate Meta measurement behind consent`

## Tarefa 7 - Centralizar identidade legal e suporte

### Arquivos

- Modificar `web/src/lib/env-server-core.ts` e testes.
- Modificar `web/src/lib/env-server.ts`.
- Criar `web/src/lib/legal-identity.ts` e teste.
- Modificar `web/src/lib/support-contact.ts` e teste.
- Modificar `web/src/app/termos/page.tsx`.
- Modificar `web/src/app/privacidade/page.tsx`.
- Modificar `web/src/app/app/configuracoes/diagnostico/page.tsx`.
- Modificar landing/rodape apenas para consumir a fonte central.
- Modificar `.env.local.example` e `web/PRODUCAO.md`.

### Implementacao

1. Adicionar os cinco campos opcionais definidos na spec.
2. Normalizar strings vazias e validar data/documento sem logar o valor.
3. Expor no servidor um estado `complete` com campos publicos formatados.
4. Usar `SUPPORT_EMAIL` centralizado no mailto.
5. Renderizar identidade completa nos documentos e rodape somente quando
   configurada.
6. Exibir bloqueio comercial no diagnostico enquanto estiver incompleta.
7. Nao copiar CPF/endereco de historico, chat ou fixtures.
8. Documentar que revisao juridica humana continua obrigatoria.

### Verificacao

- Testes com identidade completa, parcial e ausente.
- Build sem os campos continua passando.
- Diagnostico marca bloqueio quando ausentes.
- Nenhum valor sensivel aparece em logs, testes ou commit.

### Commit

`feat: centralize Prumo legal identity`

## Tarefa 8 - Melhorar LCP e contraste sem redesign

### Arquivos

- Modificar `web/src/app/page.tsx`.
- Criar `web/src/app/landing-faq.tsx`.
- Modificar `web/src/app/globals.css`.
- Modificar `web/src/app/precos/page.tsx`.
- Modificar componentes compartilhados apenas quando usam o contraste invalido.
- Remover imports landing-only de Framer Motion/Aurora/Highlight.

### Implementacao

1. Tornar a landing um Server Component.
2. Isolar somente o FAQ como Client Component.
3. Remover estado invisivel e animacao do H1/LCP.
4. Remover glows e decoracoes pesadas acima da dobra.
5. Preservar conteudo, secoes e ativos reais atuais.
6. Ajustar token primario claro e foreground escuro para contraste AA.
7. Substituir verdes diretos inconsistentes por token ou tom aprovado.
8. Verificar hover, focus, disabled, loading e reduced motion.

### Verificacao

- Testes/build de Server e Client Components.
- Contraste automatizado em landing, precos e login.
- Lighthouse mobile em tres execucoes comparaveis.
- QA visual em 375, 390, 768 e 1440 px.

### Commit

`perf: server render Prumo landing`

## Tarefa 9 - Adicionar SEO tecnico e CSP Report-Only

### Arquivos

- Modificar `web/src/app/layout.tsx`.
- Criar `web/src/app/robots.ts`.
- Criar `web/src/app/sitemap.ts`.
- Criar `web/src/app/opengraph-image.tsx` ou ativo raster equivalente.
- Modificar `web/next.config.mjs`.
- Criar testes puros/integracao para metadata e headers.

### Implementacao

1. Definir `metadataBase`, canonical e imagens Open Graph/Twitter.
2. Gerar imagem social usando a marca e um ativo real do produto.
3. Listar apenas landing, precos, ajuda, termos e privacidade no sitemap.
4. Bloquear indexacao de app, auth, onboarding, checkout, APIs e links com token.
5. Manter `X-Robots-Tag` das rotas publicas privadas.
6. Adicionar CSP em `Content-Security-Policy-Report-Only`.
7. Declarar apenas origens realmente usadas; nao promover para enforcement.

### Verificacao

- Abrir `/robots.txt`, `/sitemap.xml` e imagem social.
- Verificar headers de `/`, `/app` e `/q/token-invalido`.
- Build e E2E sem bloqueio de script, imagem, PDF ou auth.
- Lighthouse SEO sem regressao.

### Commit

`feat: add Prumo technical SEO safeguards`

## Tarefa 10 - Restaurar suite de release e publicar

### Arquivos

- Modificar `web/e2e/browser/operational-lists.spec.ts`.
- Modificar `web/e2e/browser/professional-profile.spec.ts`.
- Modificar `web/e2e/browser/core-flow.spec.ts`.
- Modificar helpers E2E de screenshot quando necessario.
- Atualizar relatorio de auditoria e documentacao de producao.

### Implementacao

1. Atualizar expectativas antigas para copia e prefixo atuais.
2. Preferir papel, URL, estado e identificadores acessiveis estaveis.
3. Trocar screenshot full-page longo por viewport/helper resiliente.
4. Rodar suite completa desktop/mobile.
5. Classificar qualquer skip externo de forma explicita.
6. Executar QA visual real, sem mockups.
7. Revisar diffs, segredos e arquivos alterados.
8. Fazer push, acompanhar Vercel e executar smoke no dominio principal.
9. Verificar monitor, logs, checkout sem cobranca, CSV, PDF e links publicos.

### Gates finais

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev --audit-level=moderate`
- `npx supabase db lint`
- comparacao de migracoes local/remoto
- `npm run test:e2e`
- Lighthouse 3x em landing, precos e login

### Commit

`test: restore green production release gate`

## Ordem de commits

1. `fix: restore backup verification and storage coverage`
2. `fix: harden public diary photo access`
3. `fix: protect accounting export integrity`
4. `fix: bound Asaas request duration`
5. `fix: retire unsafe anonymous event ingestion`
6. `feat: gate Meta measurement behind consent`
7. `feat: centralize Prumo legal identity`
8. `perf: server render Prumo landing`
9. `feat: add Prumo technical SEO safeguards`
10. `test: restore green production release gate`

Commits adjacentes so podem ser combinados quando a separacao produzir um estado
que nao compile. O checklist alterado pelo usuario permanece fora deles.

## Dependencias externas

O codigo pode ser concluido sem estes dados, mas os itens abaixo permanecerao
como bloqueios honestos de lancamento:

- credenciais Meta de producao;
- nome/documento/endereco legais aprovados pelo responsavel;
- revisao juridica dos textos;
- projeto Supabase descartavel para um ensaio remoto completo de restore;
- ensaio financeiro real controlado feito pelo responsavel.

Nenhuma dessas pendencias sera marcada como concluida por inferencia.

## Criterios finais

1. Os 14 criterios da spec estao atendidos ou identificados como dependencia
   externa com diagnostico visivel.
2. Nenhum teste automatizado cria cobranca real.
3. Nenhum segredo ou documento pessoal entra no Git.
4. Todos os gates locais passam.
5. E2E completo passa sem falha silenciosa.
6. Lighthouse atinge as metas pela mediana de tres execucoes.
7. Deploy de producao fica saudavel e o smoke principal passa.
8. O usuario pode vender de forma controlada sem depender de comportamento
   inventado ou promessa inexistente.
