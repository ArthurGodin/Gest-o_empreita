# Prumo - Painel privado de saude operacional - Plano de implementacao

**Spec:** [2026-07-20-prumo-painel-saude-operacional-design.md](../specs/2026-07-20-prumo-painel-saude-operacional-design.md)

## Objetivo

Entregar uma leitura privada, compacta e somente leitura do monitor operacional
ja publicado, acessivel exclusivamente aos emails autorizados no servidor.

O incremento nao pode alterar cron, incidentes, pagamentos, planos, webhook,
SINAPI ou dados de clientes.

## Ordem de seguranca

1. Definir e testar a autorizacao antes de criar a pagina.
2. Criar um leitor proprio, incapaz de escrever nas tabelas operacionais.
3. Sanitizar os dados em um view model puro antes de renderizar.
4. Adicionar o link apenas depois que a rota estiver protegida.
5. Validar conta autorizada e conta comum antes do deploy.

## Lote 1 - Ambiente e autorizacao

### Tarefa 1 - Allowlist server-side

- adicionar `OPERATIONAL_ADMIN_EMAILS` ao schema e ao carregamento server-only;
- aceitar lista separada por virgula e manter ausencia como acesso negado;
- criar parser puro que normaliza espacos, caixa e duplicatas;
- criar verificacao por igualdade exata do email autenticado;
- testar allowlist vazia, email parecido, dominio parecido, caixa e espacos;
- documentar somente o nome da variavel, sem incluir segredos.

### Tarefa 2 - Guard da pagina

- criar helper server-only que usa o usuario autenticado;
- executar `notFound()` antes de qualquer consulta administrativa;
- manter o fluxo normal do layout para usuario sem sessao;
- provar em teste que a consulta nao e chamada quando o acesso falha.

Checkpoint:

`feat: protect operational health access`

## Lote 2 - Leitura e dominio puro

### Tarefa 3 - View model operacional

- criar tipos fechados para `healthy`, `warning`, `critical`, `checking`,
  `unknown` e `unavailable`;
- classificar limites de 15 minutos, 36 horas e 48 horas;
- aplicar precedencia entre atraso, run e incidentes;
- mapear `check_name` para rotulo e orientacao fixa em portugues;
- omitir fingerprint, contexto, IDs e valores livres de fornecedor;
- formatar apenas datas e contagens necessarias para a pagina.

### Tarefa 4 - Leitor somente leitura

- criar modulo server-only separado do repositorio do monitor;
- buscar o run mais recente com selecao explicita e limite 1;
- buscar contagens de incidentes abertos por severidade;
- buscar no maximo 20 incidentes, criticos primeiro e depois recentes;
- retornar resultado sanitizado ou erro tipado sem detalhes de banco;
- registrar falha de leitura com codigo fixo no servidor.

Testes devem usar fixtures sem PII e procurar chaves proibidas no objeto
serializado.

Checkpoint:

`feat: read sanitized operational health`

## Lote 3 - Interface privada

### Tarefa 5 - Pagina de saude

- criar `/app/configuracoes/saude-operacional` como Server Component;
- usar `PageContainer`, `PageHeader`, tokens atuais e icones Lucide;
- mostrar faixa de estado, ultima verificacao, alertas e incidentes;
- mostrar lista densa ou estado vazio saudavel;
- tratar `unknown`, `checking`, atraso, `critical` e `unavailable`;
- usar `time` com timestamp completo e texto legivel em Brasilia;
- evitar cards aninhados, rolagem horizontal e componentes grandes.

### Tarefa 6 - Link condicional

- mostrar "Saude do Prumo" em Configuracoes somente para a allowlist;
- manter Diagnostico de producao separado;
- nao enviar a allowlist para Client Components;
- preservar a navegacao e o logout existentes.

Checkpoint:

`feat: add private operational health panel`

## Lote 4 - Validacao local

### Tarefa 7 - Gates focados

- executar testes de autorizacao e view model;
- executar `npm run typecheck`;
- executar `npm run lint`;
- corrigir a causa de qualquer falha sem afrouxar tipos ou seguranca.

### Tarefa 8 - Suite e build

- executar `npm run test`;
- executar `npm run build`;
- executar `git diff --check`;
- buscar campos proibidos na saida e no HTML de teste;
- confirmar que `docs/CHECKLIST_LANCAMENTO.md` continua fora dos commits.

### Tarefa 9 - QA visual real

- iniciar o app local com ambiente de desenvolvimento valido;
- testar viewport mobile e desktop com uma conta autorizada;
- confirmar densidade, quebras de texto, estados e ausencia de overflow;
- testar a rota com uma conta comum e confirmar 404;
- salvar apenas evidencias sanitizadas.

## Lote 5 - Rollout

### Tarefa 10 - Configuracao e deploy

- configurar `OPERATIONAL_ADMIN_EMAILS=arthurgodinho155@gmail.com` na Vercel
  sem prefixo publico;
- publicar os commits depois de todos os gates locais;
- confirmar deploy Ready sem migration;
- testar producao autenticado com a conta fundadora;
- testar que uma conta comum nao recebe dados nem link;
- inspecionar HTML e logs por PII, IDs, contexto e segredos.

### Tarefa 11 - Fechamento

- registrar commit, URL e resultados dos gates;
- confirmar que o painel e somente leitura;
- confirmar que cron, pagamento, plano e webhook nao foram alterados;
- manter somente mudancas preexistentes do usuario no worktree.

## Criterios de pronto

- allowlist ausente nega acesso;
- somente a conta fundadora ve link e pagina em producao;
- terceiros recebem 404 antes da consulta administrativa;
- o estado geral nunca mascara run atrasado ou incidente critico;
- o navegador nao recebe fingerprint, contexto, UUID ou dado pessoal;
- a tela funciona sem overflow em mobile e desktop;
- testes, lint, typecheck e build passam;
- nenhum fluxo financeiro ou comercial muda de comportamento.
