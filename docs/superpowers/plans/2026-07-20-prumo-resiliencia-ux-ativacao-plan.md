# Prumo - Plano de resiliencia, UX e ativacao guiada

**Spec:** [2026-07-20-prumo-resiliencia-ux-ativacao-design.md](../specs/2026-07-20-prumo-resiliencia-ux-ativacao-design.md)

## Objetivo

Fechar seguranca e recuperacao verificaveis, consolidar a experiencia visual e
conduzir uma conta nova ate o primeiro orcamento real sem alterar contratos de
pagamento, planos, PDF ou isolamento por empresa.

## Ordem de execucao

1. provar isolamento e limites antes de alterar jornadas;
2. tornar backup verificavel sem tocar producao;
3. extrair progresso de ativacao para dominio puro;
4. reformular onboarding e Home;
5. aplicar orientacao contextual nos modulos;
6. executar QA completo e rollout em checkpoints.

## Lote 1 - Seguranca verificavel

### Tarefa 1 - Matriz de isolamento entre empresas

- criar duas contas e duas empresas descartaveis no Supabase local;
- inserir clientes, orcamentos, obras, custos, diario e cobrancas via admin;
- autenticar cada conta com cliente RLS-scoped;
- provar que leitura, update e delete cruzados nao retornam nem alteram dados;
- provar que RPCs usadas pelo produto nao aceitam recurso de outro tenant;
- limpar empresas e usuarios no `finally`.

Arquivo previsto:

- `web/e2e/database/tenant-isolation.spec.ts`

### Tarefa 2 - Superficie publica e buckets

- ampliar o smoke publico para procurar campos proibidos no HTML e JSON;
- confirmar que custos, ponto, IDs internos, `safe_context`, fingerprints e
  caminhos privados nao chegam ao navegador anonimo;
- consultar buckets com cliente anonimo e provar que fotos, PDFs e listagem de
  logos nao sao enumeraveis;
- manter leitura do arquivo publico de logo somente por URL conhecida;
- cobrir webhook sem token e duplicacao com os testes atuais, sem enviar evento
  real ao Asaas.

Arquivos previstos:

- `web/e2e/database/tenant-isolation.spec.ts`
- `web/e2e/browser/public-smoke.spec.ts`

### Tarefa 3 - Politica de upload testavel

- extrair limites puros de MIME, tamanho e dimensoes do upload de diario;
- validar `Content-Length` quando presente antes de ler o corpo;
- preservar autenticacao, pertencimento, resize, EXIF strip e limite de pixels;
- retornar codigos estaveis sem ecoar nome de arquivo ou caminho interno;
- testar limite, MIME e payload ausente sem acessar Storage.

Arquivos previstos:

- `web/src/lib/uploads/diary-upload-policy.ts`
- `web/src/lib/uploads/diary-upload-policy.test.ts`
- `web/src/app/api/diary/upload/route.ts`

Checkpoint:

`test: prove tenant and upload isolation`

## Lote 2 - Backup e recuperacao

### Tarefa 4 - Verificador de pacote

- criar modelo puro para validar nome, tamanho, checksum e entradas obrigatorias;
- aceitar pacote `.zip.age` e arquivo `.sha256` correspondente;
- opcionalmente descriptografar com `age` para um temporario fora do workspace;
- inspecionar ZIP em streaming e exigir `roles.sql`, `schema.sql`, `data.sql`,
  `manifest.json` e diretorio `storage`;
- apagar temporarios mesmo quando a verificacao falhar;
- nunca aceitar chave privada como argumento de linha de comando.

Arquivos previstos:

- `web/src/lib/operations/backup-verification-core.ts`
- `web/src/lib/operations/backup-verification-core.test.ts`
- `web/scripts/verify-backup.ts`
- `web/package.json`

### Tarefa 5 - Guard de restauracao isolada

- adicionar script que aceita somente host local por padrao;
- exigir confirmacao explicita para qualquer ambiente descartavel remoto;
- recusar host, ref ou URL identificados como producao;
- validar dumps e manifest antes de executar `psql`;
- registrar somente duracao, versao do pacote e resultado;
- manter o ensaio real pendente se nao houver pacote, chave e destino seguros.

Arquivos previstos:

- `ops/test-restore-supabase.ps1`
- `docs/operacao-backup-restauracao.md`
- `docs/evidencias/README.md` ou relatorio sanitizado equivalente.

Checkpoint:

`feat: verify Prumo backup recovery artifacts`

## Lote 3 - Dominio de ativacao

### Tarefa 6 - Modelo puro de progresso

- mover o calculo atual para modulo de dominio sem React;
- definir etapas `company`, `customer`, `quote`, `share`, `approval`, `project`,
  `payment_setup` e `entry_payment`;
- manter uma unica proxima acao e contagem de progresso;
- colocar recebimento depois da obra, sem bloquear proposta;
- diferenciar cobranca ausente, pendente, atrasada, cancelada e paga;
- cobrir conta vazia, jornada parcial, operacao madura e dados de exemplo.

Arquivos previstos:

- `web/src/lib/activation/activation-core.ts`
- `web/src/lib/activation/activation-core.test.ts`
- `web/src/app/app/page.tsx`

### Tarefa 7 - Guia compacto de ativacao

- substituir o roteiro de primeira entrada por guia de primeira proposta;
- abrir por padrao para conta nova e permitir recolher sem esconder progresso;
- destacar somente a proxima melhor acao;
- manter todas as etapas acessiveis em expansao;
- desaparecer quando a jornada estiver concluida;
- respeitar reduced motion, mobile e safe area.

Arquivos previstos:

- `web/src/app/app/first-money-guide.tsx` ou substituto com migracao direta;
- `web/src/app/app/page.tsx`
- `web/src/app/app/sample-data-button.tsx`

Checkpoint:

`feat: guide users to their first real quote`

## Lote 4 - Onboarding inicial

### Tarefa 8 - Formulario e composicao

- manter nome da empresa como unico campo obrigatorio;
- preservar WhatsApp, cidade, UF e plano escolhido;
- reduzir texto promocional e remover blocos que competem com o formulario;
- usar uma composicao compacta que mostre marca, objetivo e formulario na
  primeira viewport mobile;
- mostrar por que cada dado opcional sera usado;
- manter erros inline, foco, loading e submit idempotente;
- redirecionar plano pago para checkout e plano Gratis para Home.

Arquivos previstos:

- `web/src/app/onboarding/form.tsx`
- `web/src/app/onboarding/actions.ts` apenas se o contrato de erro exigir ajuste;

### Tarefa 9 - E2E do onboarding

- criar conta e empresa com os campos minimos;
- provar que duplo submit nao cria segunda empresa;
- provar que plano pago preserva redirecionamento;
- provar que Home aponta cliente como proxima acao;
- limpar conta e empresa descartaveis.

Arquivo previsto:

- `web/e2e/browser/guided-activation.spec.ts`

Checkpoint:

`feat: simplify Prumo first-use onboarding`

## Lote 5 - Orientacao contextual e convergencia visual

### Tarefa 10 - Estados vazios compartilhados

- evoluir `EmptyState` para suportar acao principal e alternativa sem cards
  aninhados;
- manter texto curto: estado, consequencia e comando;
- aplicar em clientes, orcamentos, obras, financeiro e catalogo;
- esconder instrucoes de iniciante quando o modulo possuir dados;
- separar dados de exemplo da acao recomendada.

Arquivos previstos:

- `web/src/components/app-shell/empty-state.tsx`
- paginas/listas de clientes, orcamentos, obras, financeiro e catalogo.

### Tarefa 11 - Proximas acoes por jornada

- depois do primeiro cliente, favorecer novo orcamento;
- em orcamento pronto, favorecer revisao e envio;
- em aprovado sem obra, favorecer conversao;
- em obra sem recebimento, favorecer configuracao e cobranca;
- nao redirecionar automaticamente usuarios experientes;
- manter mensagens de sucesso e erro consistentes.

Arquivos previstos:

- componentes de detalhe e listas ja responsaveis por cada CTA;
- nenhum estado global novo sem necessidade comprovada.

### Tarefa 12 - Auditoria de sistema visual

- revisar cores, espacamentos, tipografia, cards, botoes e feedback nas
  superficies definidas na spec;
- corrigir somente inconsistencias observadas no codigo ou QA;
- manter a identidade atual da landing e os tokens do app;
- confirmar alvos de 44 px, fonte de input, labels, foco e overflow;
- evitar reforma cosmetica de telas maduras sem ganho de uso.

Checkpoint:

`feat: unify contextual guidance across Prumo`

## Lote 6 - Validacao e rollout

### Tarefa 13 - Gates locais

- testes focados a cada lote;
- `npm run test`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- `npm run audit:ci`;
- `git diff --check`;
- confirmar que `docs/CHECKLIST_LANCAMENTO.md` permanece fora dos commits.

### Tarefa 14 - E2E e QA real

- rodar isolamento, onboarding, core flow, listas, editor e mobile shell;
- usar conta e empresa descartaveis;
- capturar 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900;
- verificar zoom, overflow, foco, console e dados sensiveis;
- nao criar mockups nem usar dados reais nas evidencias.

### Tarefa 15 - Publicacao

- revisar diff e separar commits por risco;
- enviar `main` somente com gates verdes;
- acompanhar CI e deploy Vercel Ready;
- executar smoke publico e autenticado;
- registrar backup externo como pendencia se a evidencia real ainda nao existir;
- nao executar restore, webhook ou cobranca destrutiva em producao.

## Invariantes

- RLS e Server Actions continuam sendo autoridade.
- Nenhuma credencial, CPF/CNPJ, chave Pix ou token entra em logs, analytics ou QA.
- Nenhum pagamento ou plano muda neste lote.
- Nenhum limitador em memoria sera tratado como protecao distribuida.
- Nenhuma tabela de onboarding sera criada sem necessidade comprovada.
- Orientacao nunca bloqueia o trabalho normal.
- Dados de exemplo nunca se apresentam como dados reais.
- Backup externo so recebe status concluido com artefato e destino reais.

## Criterios de pronto

1. Isolamento entre empresas e superficie publica estao cobertos por E2E.
2. Uploads invalidos falham antes de persistir.
3. Pacote de backup pode ser verificado sem expor chave privada.
4. Restore harness recusa producao e documenta ensaio isolado.
5. Conta nova recebe cliente como primeira acao real.
6. Pix nao bloqueia a criacao e o envio da proposta.
7. Estados vazios orientam sem poluir operacoes maduras.
8. Onboarding, Home e modulos usam a mesma linguagem visual.
9. QA mobile e desktop nao encontra zoom, overflow ou acao coberta.
10. Suite, CI, deploy e smoke passam sem regressao financeira.
