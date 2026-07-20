# Prumo - Central de Ajuda e suporte contextual - Plano de implementação

**Spec:** [2026-07-20-prumo-central-ajuda-design.md](../specs/2026-07-20-prumo-central-ajuda-design.md)

## Objetivo

Entregar uma Central de Ajuda pública, pesquisável, fiel ao produto e acessível
por mobile e desktop. O canal provisório será `arthurgodinho155@gmail.com` e
nenhum dado digitado, identificador interno ou termo pesquisado poderá entrar em
analytics ou no link de contato.

O lote não altera Supabase, Asaas, planos, PDFs, RLS ou autorização.

## Ordem de execução

1. fechar domínio, conteúdo e privacidade com testes puros;
2. construir a página pública e seus estados;
3. ligar navegação pública e autenticada;
4. corrigir contato legal e recuperação de erro;
5. executar QA, publicar e confirmar produção.

## Lote 1 - Domínio e contrato de privacidade

### Tarefa 1 - Fonte tipada de conteúdo

- criar categorias estáveis para primeiros passos, clientes, orçamentos,
  aprovação, obras, cobranças, planos e segurança;
- escrever perguntas e respostas somente sobre recursos existentes;
- incluir palavras-chave para Pix, SINAPI, PDF, validade, cancelamento e senha;
- permitir passos e rota opcional sem HTML arbitrário;
- exportar validação de tópico e categoria conhecidos;
- manter o módulo seguro para Client Components, sem imports server-only.

Arquivos previstos:

- `web/src/lib/help-center.ts`
- `web/src/lib/help-center.test.ts`

### Tarefa 2 - Busca pura

- normalizar caixa, acentos e espaços;
- pesquisar categoria, pergunta, resposta e palavras-chave;
- filtrar opcionalmente por categoria;
- preservar ordem editorial estável;
- retornar lista completa para consulta vazia;
- cobrir acentos, palavras compostas e resultado vazio.

Arquivos previstos:

- `web/src/lib/help-center.ts`
- `web/src/lib/help-center.test.ts`

### Tarefa 3 - Contato seguro

- centralizar o e-mail aprovado em constante pública;
- construir `mailto:` com assunto e corpo fixos por fonte/tópico conhecido;
- rejeitar tópico e fonte desconhecidos para evitar conteúdo livre;
- nunca inserir URL atual, UUID, token, busca, CPF/CNPJ ou dado de dispositivo;
- testar codificação e ausência de campos proibidos.

Arquivos previstos:

- `web/src/lib/support-contact.ts`
- `web/src/lib/support-contact.test.ts`

Checkpoint:

`test: define safe Prumo help content`

## Lote 2 - Página pública

### Tarefa 4 - Estrutura server-first

- criar `/ajuda` com metadata e conteúdo disponível sem autenticação;
- usar cabeçalho compacto Prumo, busca, categorias, tópicos, contato e links
  legais;
- passar somente tópico validado a partir de `searchParams`;
- manter lista e `<details>` funcionais sem JavaScript;
- ignorar parâmetros desconhecidos sem erro ou redirecionamento;
- não consultar Supabase nem sessão.

Arquivos previstos:

- `web/src/app/ajuda/page.tsx`
- `web/src/app/ajuda/help-center.tsx`

### Tarefa 5 - Busca e filtros acessíveis

- usar input com label visível e resultado em `aria-live`;
- usar categorias como controles compactos sem overflow;
- atualizar resultados localmente;
- mostrar ação de limpar e suporte no estado vazio;
- abrir o tópico selecionado por parâmetro conhecido;
- manter foco visível e alvos de toque de 44 px;
- não animar conteúdo para usuários com reduced motion.

Arquivos previstos:

- `web/src/app/ajuda/help-center.tsx`
- `web/src/app/globals.css` somente se um token existente não resolver.

### Tarefa 6 - Contato rastreável sem PII

- criar componente reutilizável para o e-mail de suporte;
- montar href apenas pelo helper seguro;
- registrar clique com `source`, categoria e tópico conhecidos;
- exibir aviso para não enviar senha, cartão ou documento completo;
- não bloquear o `mailto:` quando analytics falhar.

Arquivos previstos:

- `web/src/components/support-contact-link.tsx`
- `web/src/lib/product-event-names.ts`
- `web/src/lib/product-analytics.ts` apenas se o contrato exigir ajuste.

Checkpoint:

`feat: add public Prumo help center`

## Lote 3 - Navegação pública e autenticada

### Tarefa 7 - App mobile e desktop

- adicionar `Ajuda e suporte` ao menu de conta mobile;
- adicionar ação equivalente no rodapé da sidebar;
- manter Meu Plano, Configurações e Sair nas posições atuais;
- incluir a Central em `Mais ajustes` nas Configurações;
- assegurar acesso em até dois comandos e sem esconder logout.

Arquivos previstos:

- `web/src/components/app-shell/mobile-topbar.tsx`
- `web/src/components/app-shell/sidebar.tsx`
- `web/src/app/app/configuracoes/page.tsx`

### Tarefa 8 - Entrada, recuperação e páginas comerciais

- adicionar ajuda discreta em login e recuperação de senha;
- adicionar link no rodapé da landing e da página de preços;
- preservar CTAs comerciais e hierarquia atual;
- evitar card novo ou bloco promocional para suporte.

Arquivos previstos:

- `web/src/app/(auth)/login/page.tsx`
- `web/src/app/(auth)/forgot-password/page.tsx`
- `web/src/app/page.tsx`
- `web/src/app/precos/page.tsx`
- layout autenticado se for o ponto compartilhado correto.

Checkpoint:

`feat: connect help across Prumo navigation`

## Lote 4 - Contato legal e recuperação

### Tarefa 9 - Termos e Privacidade

- substituir canal abstrato pelo e-mail aprovado e link da Central;
- atualizar a data porque o conteúdo foi revisado;
- não declarar razão social, CNPJ ou nome civil inexistente;
- manter linguagem de pagamento e privacidade já validada.

Arquivos previstos:

- `web/src/app/termos/page.tsx`
- `web/src/app/privacidade/page.tsx`

### Tarefa 10 - Estados de erro

- adicionar caminho real de ajuda à error boundary autenticada;
- adicionar Central de Ajuda ao 404 geral;
- adicionar suporte ao estado de orçamento público inválido;
- manter tentar novamente, voltar e pedir novo link como ações principais;
- nunca incluir `digest`, URL ou token no contato.

Arquivos previstos:

- `web/src/app/app/error.tsx`
- `web/src/app/not-found.tsx`
- `web/src/app/q/[token]/not-found.tsx`

Checkpoint:

`feat: make Prumo support contact explicit`

## Lote 5 - Analytics, testes e rollout

### Tarefa 11 - Eventos sem dados pessoais

- permitir `help_center_opened`, `help_topic_opened`, `help_search_used` e
  `support_email_clicked`;
- emitir abertura uma vez por montagem;
- emitir busca somente após consulta estável com pelo menos dois caracteres;
- enviar somente `has_results` e `result_count` entre 0 e 20;
- não mapear eventos de ajuda como conversões da Meta;
- testar requests inválidos pelo contrato atual da API.

Arquivos previstos:

- `web/src/lib/product-event-names.ts`
- `web/src/app/api/product-events/route.test.ts`
- `web/src/lib/meta-events.test.ts` para provar que todos os eventos de ajuda
  retornam `null` e não viram conversão.

### Tarefa 12 - E2E público e autenticado

- abrir `/ajuda` deslogado;
- pesquisar `Pix`, `orçamento`, `SINAPI` e `cancelar`;
- provar estado vazio e recuperação;
- verificar mailto sem dado proibido;
- conferir links em landing, login, Termos e Privacidade;
- conferir menu mobile, sidebar desktop e Configurações;
- procurar overflow, erro de console, UUID, token e segredo no HTML.

Arquivos previstos:

- `web/e2e/browser/public-smoke.spec.ts`
- `web/e2e/browser/responsive-shell.spec.ts`
- novo spec dedicado somente se os arquivos existentes perderem foco.

### Tarefa 13 - Gates locais

- testes focados do domínio e analytics;
- `npm run typecheck`;
- `npm run lint`;
- `npm test`;
- `npm run audit:ci`;
- `npm run build`;
- E2E desktop e mobile;
- `git diff --check`;
- confirmar que `docs/CHECKLIST_LANCAMENTO.md` permanece fora dos commits.

### Tarefa 14 - QA visual real

- iniciar app local e usar navegador real, sem mockup;
- verificar 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900;
- testar busca, teclado, abertura de tópicos, estado vazio e menus;
- confirmar ausência de overflow, sobreposição e erro de console;
- não usar dados reais nas evidências.

### Tarefa 15 - Publicação

- separar commits por domínio, interface e integração quando útil;
- enviar `main` somente com gates verdes;
- acompanhar GitHub Actions e Vercel até estado terminal;
- confirmar alias `https://gestao-empreita.vercel.app`;
- executar smoke final de `/ajuda`, login e preços;
- registrar identidade jurídica do fornecedor como pendência, sem bloquear este
  lote técnico.

## Invariantes

- A Central de Ajuda funciona sem login e sem Supabase.
- Conteúdo promete somente o que existe no produto.
- Busca e contato não enviam texto livre para analytics.
- Nenhum token, UUID, CPF/CNPJ, chave Pix ou segredo é exposto.
- O e-mail de suporte tem uma única fonte no código.
- Ajuda não desloca nem esconde ações comerciais ou logout.
- Nenhum fluxo de pagamento, plano, PDF ou autorização muda.
- O checklist modificado pelo usuário não entra nos commits.

## Critérios de pronto

1. `/ajuda` funciona deslogado, com e sem JavaScript.
2. Busca por termos centrais encontra respostas corretas.
3. Sem resultado oferece limpar busca e contato seguro.
4. App mobile e desktop chegam à ajuda em até dois comandos.
5. Landing, autenticação, Termos, Privacidade e erros têm caminho real.
6. Analytics não recebe busca, e-mail ou identificador interno.
7. Mobile e desktop não apresentam overflow ou erro de console.
8. Testes, build, CI, deploy e smoke passam.
