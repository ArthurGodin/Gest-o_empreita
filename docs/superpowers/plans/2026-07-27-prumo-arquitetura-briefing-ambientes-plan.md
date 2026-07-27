# Prumo Arquitetura V1 - Plano de implementação

**Spec:** [2026-07-27-prumo-arquitetura-briefing-ambientes-design.md](../specs/2026-07-27-prumo-arquitetura-briefing-ambientes-design.md)

## Objetivo

Entregar o núcleo de uso recorrente para Arquitetura e Interiores: briefing
compartilhável, revisões protegidas, ambientes e necessidades integrados ao
projeto atual. O lote preserva login, propostas, Asaas, financeiro, PDFs,
SINAPI e entregáveis.

## Ordem de execução

1. domínio puro, schemas e limites com testes;
2. migration aditiva, RLS e funções transacionais;
3. consultas e actions autenticadas/públicas;
4. workspace interno de Briefing e Ambientes;
5. formulário público mobile com autosave;
6. planos, eventos, kit de demonstração e ajuda;
7. gates, QA real e rollout.

## Lote 1 - Domínio

### Tarefa 1 - Catálogo de briefings

- criar tipos serializáveis para seções, perguntas e respostas;
- entregar modelos residencial, interiores e comercial compacto;
- validar snapshots e respostas sem depender de React ou Supabase;
- calcular progresso apenas pelos campos obrigatórios;
- extrair sugestões de ambientes a partir das respostas;
- limitar textos, arrays, opções e valores numéricos.

Arquivos:

- `web/src/lib/briefings.ts`
- `web/src/lib/briefings.test.ts`

### Tarefa 2 - Regras comerciais

- definir limites explícitos de briefing, revisão e ambientes;
- manter Grátis com um briefing, uma revisão e três ambientes;
- aplicar limites técnicos honestos em Pro e Ultimate;
- produzir mensagens de upgrade sem esconder dados existentes.

Arquivos:

- `web/src/lib/architecture-plan-limits.ts`
- `web/src/lib/architecture-plan-limits.test.ts`

## Lote 2 - Banco e segurança

### Tarefa 3 - Estrutura aditiva

- criar `project_briefings`;
- criar `project_briefing_revisions`;
- criar `project_spaces`;
- criar `project_space_requirements`;
- adicionar índices, constraints, updated_at e guardas de escopo;
- ativar RLS tenant-scoped;
- atualizar tipos locais do Supabase.

Arquivos:

- `supabase/migrations/20260727000001_project_briefings_and_spaces.sql`
- `web/src/lib/supabase/types.ts`

### Tarefa 4 - Funções transacionais

- criar briefing com snapshot e primeira revisão;
- compartilhar, revisar, reabrir e arquivar;
- salvar respostas públicas com controle otimista de versão;
- enviar revisão de forma idempotente;
- aplicar limites no banco;
- não conceder RPC público diretamente a `anon`.

Checkpoint:

`feat: add architecture briefing domain`

## Lote 3 - Camada server-side

### Tarefa 5 - Consultas

- carregar briefing e revisão ativa do projeto autenticado;
- carregar ambientes e necessidades em ordem estável;
- expor contrato público mínimo após validar o token da proposta;
- tolerar projeto sem briefing.

Arquivos:

- `web/src/lib/queries/briefings.ts`
- `web/src/lib/queries/project-spaces.ts`

### Tarefa 6 - Actions

- validar autenticação, empresa, projeto, segmento e plano;
- validar todo input no servidor;
- criar e controlar briefing por RPC;
- criar, editar, duplicar, ordenar e arquivar ambientes;
- adicionar e concluir necessidades;
- salvar e enviar respostas públicas com cliente administrativo somente após
  validar token e vínculo;
- revalidar somente rotas afetadas.

Arquivos:

- `web/src/app/app/obras/[id]/briefing-actions.ts`
- `web/src/app/app/obras/[id]/space-actions.ts`
- `web/src/app/q/[token]/briefing-actions.ts`

## Lote 4 - Workspace interno

### Tarefa 7 - Navegação contextual

- manter navegação atual para Execução;
- usar Resumo, Briefing, Ambientes, Etapas, Entregas e Gestão em Arquitetura e
  Interiores;
- preservar hashes e deep links;
- agrupar cobrança, diário, custos e equipe sem removê-los.

Arquivos:

- `web/src/app/app/obras/[id]/page.tsx`
- `web/src/app/app/obras/[id]/project-section-nav.tsx`

### Tarefa 8 - Briefing interno

- estado vazio com escolha de modelo;
- resumo de progresso e estado;
- copiar link e compartilhar;
- leitura das respostas por seção;
- marcar como revisado;
- reabrir com orientação;
- sugerir ambientes sem criá-los silenciosamente.

Arquivos:

- `web/src/app/app/obras/[id]/briefing-section.tsx`
- componentes pequenos específicos quando necessário.

### Tarefa 9 - Ambientes

- lista compacta e responsiva;
- criação e edição focadas;
- duplicação;
- ordenação acessível por botões;
- necessidades, restrições e preferências;
- conclusão de pendências;
- arquivamento protegido.

Arquivos:

- `web/src/app/app/obras/[id]/spaces-section.tsx`
- componentes pequenos específicos quando necessário.

Checkpoint:

`feat: add architecture project workspace`

## Lote 5 - Portal público

### Tarefa 10 - Contrato e navegação

- carregar briefing somente para projeto ligado ao token validado;
- adicionar aba Briefing sem ultrapassar cinco destinos;
- priorizar briefing compartilhado ainda não enviado;
- não expor observações internas.

Arquivos:

- `web/src/app/q/[token]/page.tsx`
- `web/src/app/q/[token]/public-toggle.tsx`

### Tarefa 11 - Formulário mobile

- renderizar blocos curtos;
- usar campos sem zoom e teclados semânticos;
- autosave sequencial com estados Salvando/Salvo/Falha;
- detectar conflito de edição;
- permitir avançar, voltar e revisar;
- focar primeiro erro;
- enviar com nome do respondente;
- mostrar leitura protegida após envio.

Arquivos:

- `web/src/app/q/[token]/public-briefing-view.tsx`
- `web/src/app/q/[token]/briefing-actions.ts`

Checkpoint:

`feat: add public mobile briefing flow`

## Lote 6 - Produto e monetização

### Tarefa 12 - Superfícies comerciais

- atualizar planos somente com recursos comprovados;
- incluir Briefing e Ambientes na Central de Ajuda;
- criar dados demonstrativos de Arquitetura/Interiores;
- registrar eventos sem PII;
- mostrar upgrade no ponto em que o limite é atingido.

Arquivos previstos:

- `web/src/lib/plans.ts`
- `web/src/lib/help-center.ts`
- `web/src/lib/product-event-names.ts`
- `web/src/app/app/configuracoes/diagnostico/actions.ts`
- preços e landing somente depois dos gates.

## Lote 7 - Qualidade e rollout

### Tarefa 13 - Gates

- testes focados do domínio;
- `npm run typecheck`;
- `npm run lint -- --no-cache`;
- `npm test -- --run`;
- `npm run build`;
- `git diff --check`;
- confirmar que `docs/CHECKLIST_LANCAMENTO.md` ficou fora dos commits.

### Tarefa 14 - QA real

- executar fluxo interno e público em dados de teste;
- validar 360x800, 390x844, 768x1024 e 1440x900;
- testar teclado, foco, textos longos, internet lenta e reload;
- confirmar ausência de overflow, zoom inesperado e erros de console;
- verificar regressão de login, proposta, PDF, Asaas e entregas.

### Tarefa 15 - Publicação

- aplicar migration remota somente após gates locais;
- publicar o commit validado;
- acompanhar CI e Vercel até estado terminal;
- executar smoke sem alterar dados reais de clientes;
- atualizar promessas comerciais somente após confirmação em produção.

## Invariantes

- Nenhum dado atravessa empresas.
- Uma resposta enviada nunca é sobrescrita.
- O cliente não precisa criar conta.
- O token público nunca aparece em log ou analytics.
- Atingir limite não remove nem esconde dados.
- Construção e Engenharia não mudam de comportamento neste lote.
- O checklist alterado pelo usuário não entra nos commits.

## Critérios de pronto

1. Os três modelos produzem snapshots válidos e estáveis.
2. Cliente salva, retoma e envia pelo celular.
3. Reabertura cria nova revisão.
4. Escritório organiza ambientes e necessidades.
5. Grátis bloqueia a quarta sala e preserva as três existentes.
6. RLS e contrato público impedem vazamentos.
7. Navegação contextual funciona sem quebrar hashes atuais.
8. Todos os gates e QA real passam.
