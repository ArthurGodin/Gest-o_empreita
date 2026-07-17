# Prumo V1 - Plano de implementacao do fechamento profissional

**Spec:** [2026-07-17-prumo-v1-fechamento-profissional-design.md](../specs/2026-07-17-prumo-v1-fechamento-profissional-design.md)

## Objetivo

Fechar as diferencas de comportamento entre os formularios do Prumo, comprovar
os gates de producao e produzir uma decisao objetiva sobre a versao `v1.0.0`,
sem alterar planos, pagamento, PDF ou regras de dominio.

## Lote 4A.1 - Fundacao compartilhada

### Tarefa 1 - Modelo de estado persistivel

- Criar utilitario puro para gerar assinatura estavel a partir de objetos
  normalizados.
- Manter normalizacao especifica de cada formulario junto ao dominio do
  formulario; o utilitario compartilhado nao deve conhecer cliente, empresa,
  Pix ou template.
- Cobrir assinatura, igualdade e alteracoes reais com testes unitarios.
- Evitar dependencia nova de formulario ou estado global.

Arquivos previstos:

- `web/src/lib/form-draft.ts`
- `web/src/lib/form-draft.test.ts`

### Tarefa 2 - Protecao de navegacao compartilhada

- Mover a protecao de navegacao do editor de orcamento para uma unidade
  compartilhada em `components/forms`.
- Parametrizar titulo, descricao e nome do conteudo alterado.
- Preservar `beforeunload`, links internos, historico, modificadores, downloads,
  links externos e ancoras locais.
- Atualizar o editor de orcamento para consumir a unidade compartilhada.
- Manter um re-export local temporario apenas se reduzir risco de imports; caso
  contrario, remover o arquivo antigo.
- Rodar o E2E do editor de orcamento imediatamente depois da extracao.

Arquivos previstos:

- `web/src/components/forms/protected-form-navigation.tsx`
- `web/src/app/app/orcamentos/[id]/quote-editor.tsx`
- `web/src/app/app/orcamentos/[id]/protected-draft-navigation.tsx`
- `web/e2e/browser/quote-editor-protection.spec.ts`

### Tarefa 3 - Estado e barra de salvamento

- Criar tipos compartilhados `saved`, `dirty`, `saving` e `error`.
- Criar apresentacao compacta para formularios de pagina sem incluir total ou
  acao de envio, que continuam exclusivos do editor de orcamento.
- Expor horario da ultima confirmacao, texto de estado e area para acoes.
- Respeitar bottom navigation, safe area, sidebar e espaco final do conteudo.
- Garantir que a barra nao seja renderizada em dialogs curtos.

Arquivos previstos:

- `web/src/components/forms/form-save-bar.tsx`
- `web/src/components/forms/form-save-status.ts`

## Lote 4A.2 - Clientes

### Tarefa 4 - Modelo e validacao cliente

- Criar tipo controlado para todos os campos do cliente.
- Normalizar espacos, documento, UF e campos opcionais antes da assinatura.
- Manter CPF/CNPJ e email validados pelo servidor; usar validacao cliente apenas
  para obrigatoriedade, tamanho e foco rapido.
- Mapear campo para id acessivel e primeiro alvo de erro.
- Adicionar testes de normalizacao e dirty state.

Arquivos previstos:

- `web/src/app/app/clientes/customer-draft.ts`
- `web/src/app/app/clientes/customer-draft.test.ts`

### Tarefa 5 - Formulario cliente protegido

- Converter `defaultValue` para estado controlado sem mudar payload ou redirect.
- Mostrar erros abaixo de nome, documento, telefone, email, endereco, cidade,
  UF, CEP e observacoes quando o servidor devolver mensagem para o campo.
- Limpar erro do campo durante correcao.
- Focar e centralizar o primeiro erro depois de submit invalido.
- Mostrar barra de salvamento no modo edicao.
- No modo criacao, preservar CTA `Cadastrar e criar orcamento` e proteger
  navegacao depois da primeira alteracao real.
- Atualizar assinatura salva somente depois do sucesso.
- Bloquear dupla submissao e deixar erro geral apenas para falha sem campo.

Arquivos previstos:

- `web/src/app/app/clientes/customer-form.tsx`
- `web/src/app/app/clientes/actions.ts` somente se faltar limite ou field error
  ja suportado pelo contrato atual.

## Lote 4A.3 - Configuracoes

### Tarefa 6 - Dados da empresa

- Criar estado controlado e assinatura normalizada para os campos textuais.
- Consumir `fieldErrors` ja retornados por `updateCompanyAction`.
- Adicionar erro inline, foco, protecao de saida e barra de salvamento.
- Manter upload de logo isolado do dirty state textual.
- Preservar revalidacao do layout e dados multi-tenant atuais.

Arquivos previstos:

- `web/src/app/app/configuracoes/company-draft.ts`
- `web/src/app/app/configuracoes/company-draft.test.ts`
- `web/src/app/app/configuracoes/company-form.tsx`

### Tarefa 7 - Forma de recebimento

- Extrair o calculo atual da assinatura para funcao pura testavel.
- Conectar `hasUnsavedChanges` a protecao de navegacao e barra de salvamento.
- Mapear `fieldErrors` para `aria-invalid`, `aria-describedby` e foco.
- Limpar erros corrigidos sem apagar mensagens de outros campos.
- Nunca incluir valor da chave Pix em analytics, log, URL ou screenshot de QA.
- Preservar o contrato atual entre Pix manual e Asaas.

Arquivos previstos:

- `web/src/app/app/configuracoes/payment-settings-draft.ts`
- `web/src/app/app/configuracoes/payment-settings-draft.test.ts`
- `web/src/app/app/configuracoes/payment-settings-form.tsx`

## Lote 4A.4 - Templates e comandos da obra

### Tarefa 8 - Templates protegidos

- Adicionar chave local estavel aos itens do template.
- Criar assinatura de nome, descricao, ordem e dias previstos.
- Mostrar erros inline no nome, etapa e dias correspondentes.
- Focar o primeiro erro e preservar foco durante reordenacao.
- Pedir confirmacao ao cancelar um template alterado.
- Atualizar referencia somente depois de sucesso.
- Preservar callbacks `onSaved` e `onCancel` da lista atual.

Arquivos previstos:

- `web/src/app/app/configuracoes/templates/template-draft.ts`
- `web/src/app/app/configuracoes/templates/template-draft.test.ts`
- `web/src/app/app/configuracoes/templates/template-form.tsx`
- `web/src/app/app/configuracoes/templates/template-list.tsx` se o contrato de
  cancelamento precisar distinguir confirmacao e fechamento.

### Tarefa 9 - Fechamento seguro de comandos da obra

- Auditar adicionar etapa, gasto e ponto para identificar o estado inicial e o
  que constitui digitacao significativa.
- Criar helper pequeno para confirmar descarte apenas quando o usuario pedir
  fechamento de um comando alterado.
- Nao usar protecao global de pagina nos dialogs curtos.
- Bloquear fechamento durante submissao.
- Adicionar labels `htmlFor`, ids, names, autocomplete e erros inline.
- Centralizar parse monetario no utilitario financeiro existente quando seguro,
  removendo parser duplicado apenas se testes comprovarem equivalencia.
- Preservar o rascunho atual do diario e uploads em andamento.

Arquivos previstos:

- `web/src/components/forms/confirm-dirty-close.tsx`
- `web/src/app/app/obras/[id]/add-stage-form.tsx`
- `web/src/app/app/obras/[id]/cost-form.tsx`
- `web/src/app/app/obras/[id]/time-form.tsx`
- testes puros para dirty state e parser reutilizado quando aplicavel.

## Lote 4A.5 - Evidencia e release

### Tarefa 10 - E2E dos formularios protegidos

- Criar conta temporaria e empresa em Supabase isolado.
- Criar cliente, editar campo, cancelar navegacao, salvar e recarregar.
- Editar empresa, provocar erro inline, corrigir, salvar e recarregar.
- Alterar Pix com valor ficticio, cancelar navegacao e salvar; nunca anexar
  screenshot ou log contendo a chave.
- Criar template, reordenar etapa, cancelar descarte e salvar.
- Abrir gasto ou ponto, digitar, tentar fechar, continuar e concluir.
- Verificar ausencia de erro de console e overflow horizontal.
- Limpar integralmente a conta temporaria.

Arquivo previsto:

- `web/e2e/browser/protected-forms.spec.ts`

### Tarefa 11 - Regressao e QA visual

- Rodar E2E do editor de orcamento depois da generalizacao da navegacao.
- Rodar core flow em desktop e mobile.
- Capturar estados reais em 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900.
- Inspecionar foco, barra fixa, teclado, dialogs e safe area.
- Arquivar apenas capturas sem dado pessoal ou financeiro real.

### Tarefa 12 - Gate tecnico e operacional

- Atualizar a auditoria de lancamento para remover pendencias ja resolvidas.
- Criar relatorio da V1 com status `aprovado`, `pendente externo` ou `bloqueado`.
- Verificar alerta de frontend e integracoes sem expor dados sensiveis.
- Confirmar existencia de backup recente e registrar se a restauracao foi
  ensaiada fora da producao.
- Listar identidade, suporte, juridico e conferencia Asaas como evidencias
  externas, nunca como valores inventados.
- Rodar typecheck, lint, testes, audit, build e `git diff --check`.
- Commitar, enviar, acompanhar CI e Vercel e executar smoke publico/autenticado.
- Criar tag `v1.0.0` somente se o gate tecnico estiver verde; declarar lancamento
  comercial somente se o gate operacional tambem estiver completo.

Arquivos previstos:

- `docs/auditoria-lancamento-seguro-2026-07-13.md`
- `docs/PRUMO_V1_RELEASE.md`
- `web/PRODUCAO.md` apenas se a ordem operacional precisar ser atualizada.

## Ordem de verificacao

1. Testes dos modelos puros.
2. Typecheck e lint a cada extracao compartilhada.
3. E2E do editor de orcamento depois da protecao compartilhada.
4. E2E isolado de clientes e configuracoes.
5. E2E de templates e comandos da obra.
6. Suite unitaria completa, audit e build.
7. Core flow desktop e mobile.
8. QA visual sem dados sensiveis.
9. Revisao de diff e relatorio de release.
10. CI, deploy e smoke de producao.

## Checkpoints de commit

1. `refactor: share protected form navigation`
2. `feat: protect Prumo customer and settings forms`
3. `feat: guard Prumo templates and project commands`
4. `test: cover Prumo protected form journeys`
5. `docs: record Prumo v1 release gate`

Os checkpoints podem ser combinados quando o diff for pequeno, mas cada commit
deve passar typecheck e testes diretamente relacionados.

## Invariantes

- Nenhuma migration nova sem necessidade comprovada.
- Nenhum dado de outro tenant pode ser lido ou atualizado.
- Server actions continuam autenticando usuario e empresa.
- Nenhuma chave Pix, CPF/CNPJ, token ou credencial entra em analytics ou QA.
- Pagamento SaaS, cobranca de obra, webhook e Asaas permanecem funcionais.
- Planos e promessas comerciais nao mudam neste lote.
- Nenhum autosave ou gravacao silenciosa em background.
- Erro de rede nunca atualiza a referencia salva.
- Navegacao protegida nunca cria loop de historico.
- SINAPI nao entra no codigo ou na landing antes da especificacao propria.

## Criterios de aceite

1. Cliente, empresa, recebimento e template mostram dirty state correto.
2. Saida com alteracao persistivel exige confirmacao.
3. Erro inline recebe foco e permanece visivel em mobile.
4. Dialog de obra alterado nao descarta conteudo silenciosamente.
5. Editor de orcamento preserva todos os comportamentos do Lote 3B.
6. Core flow comercial permanece verde em desktop e mobile.
7. Nenhum viewport de referencia apresenta overflow ou acao coberta.
8. Gates locais, CI, deploy e smoke passam.
9. Relatorio diferencia claramente codigo pronto de pendencia externa.
10. A versao so recebe tag quando o criterio documentado for atendido.
