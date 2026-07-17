# Prumo V1 - Fechamento profissional

## Contexto

O Prumo ja possui os fluxos centrais de uma V1 comercial: cadastro e onboarding,
clientes, orcamentos, link publico, PDF, aprovacao, conversao em obra, diario,
custos, financeiro, cobranca, planos e checkout recorrente. A base de producao
tambem ja conta com cotas atomicas para o plano Gratis, CI com Supabase isolado,
E2E de jornadas criticas, logs estruturados, alertas operacionais por email e
procedimento documentado de backup e restauracao.

O editor de orcamento passou a oferecer salvamento explicito, estados de
persistencia, erros inline e protecao contra perda de dados. Os formularios
longos de clientes e configuracoes ainda nao seguem integralmente esse padrao.
Alguns comandos curtos da obra tambem podem ser fechados depois de digitacao sem
explicar que o conteudo sera descartado.

Este lote fecha essas diferencas, revisa evidencias operacionais e define um gate
objetivo para publicar a versao `v1.0.0`. SINAPI fica separado como a primeira
evolucao de produto depois da V1, evitando misturar estabilidade com ingestao de
uma nova base oficial.

## Objetivo

Permitir declarar o Prumo tecnicamente pronto para venda continua, com:

1. formularios importantes previsiveis e protegidos;
2. erros acionaveis no campo correto;
3. comportamento mobile consistente;
4. perda acidental de digitacao reduzida;
5. criterios de release comprovaveis;
6. riscos externos claramente separados de pendencias de codigo.

## Nao objetivos

Este lote nao inclui:

- integracao SINAPI, importacao XLSX ou mudanca dos planos;
- novos campos de dominio para clientes, obras ou configuracoes;
- autosave em background;
- mudanca no contrato do Asaas, Pix, boleto, webhook ou assinatura;
- alteracao de PDF, link publico, aprovacao ou conversao em obra;
- substituicao do Supabase, Vercel Analytics ou alertas por email;
- painel administrativo novo;
- reescrita visual de listas e dashboards ja refinados;
- promessa comercial de recurso ainda nao publicado.

## Estado atual confirmado

As seguintes fundacoes ja existem e nao devem ser refeitas:

- cotas do Gratis protegidas por triggers com lock transacional por empresa;
- backup logico criptografado e procedimento de restauracao documentado;
- CI com lint, typecheck, testes, auditoria, build e E2E;
- jornada critica em desktop e mobile com conta descartavel;
- error boundaries com evento estruturado e alerta operacional;
- diagnostico autenticado de integracoes;
- salvamento protegido no editor de orcamento;
- rascunho do diario persistido em `sessionStorage` e upload com retry.

## Abordagem escolhida

### Fechamento incremental sobre os padroes existentes

O lote reutiliza a semantica aprovada no editor de orcamento: assinatura
normalizada, referencia do ultimo estado confirmado, quatro estados de
salvamento e protecao de saida apenas quando existe alteracao persistivel.

Essa abordagem foi escolhida em vez de:

- introduzir `react-hook-form` em todas as telas de uma vez, o que aumentaria o
  diff e o risco sem necessidade;
- implementar autosave, que criaria concorrencia com server actions, uploads e
  mudancas de provedor de recebimento;
- redesenhar todo o app novamente, apesar de shell, listas, detalhes e editor ja
  terem sido refinados e validados.

## Arquitetura compartilhada

### Modelo puro de formulario

Cada formulario longo produz uma representacao persistivel normalizada. Essa
representacao remove espacos irrelevantes e padroniza campos como UF antes de
gerar uma assinatura estavel. Estado visual, mensagens e indicadores de loading
nao participam da comparacao.

O estado salvo inicial vem dos dados entregues pelo servidor. A referencia so e
atualizada depois que a server action confirma sucesso.

### Protecao de navegacao reutilizavel

A protecao criada para o editor de orcamento sera generalizada em um componente
compartilhado que recebe:

- se ha alteracoes nao salvas;
- o substantivo exibido ao usuario, como cliente, empresa ou template;
- opcionalmente uma acao de descarte local.

O componente continua cobrindo `beforeunload`, links internos e historico do
navegador sem interceptar downloads, links externos, modificadores ou ancoras da
mesma pagina. O editor de orcamento passa a consumir a mesma unidade sem mudar
seu comportamento.

### Barra de salvamento

Formularios de pagina usam uma barra compacta com:

- `Salvo`;
- `Alteracoes nao salvas`;
- `Salvando...`;
- `Falha ao salvar`;
- horario da confirmacao na sessao;
- acao primaria de salvar;
- acao secundaria de cancelar quando fizer sentido.

No mobile, a barra fica acima da navegacao inferior e respeita safe area. No
desktop, permanece dentro da largura do conteudo e nao cobre a ultima secao.

## Fluxos cobertos

### Cliente

O formulario de criar e editar cliente passa a usar estado controlado e
assinatura normalizada para nome, documento, telefone, email, endereco, cidade,
UF, CEP e observacoes.

- Criacao continua redirecionando para o cliente ou para novo orcamento.
- Edicao informa permanentemente se as alteracoes foram salvas.
- Erros Zod aparecem abaixo do campo correspondente.
- O primeiro erro recebe foco e e rolado para a area visivel.
- A protecao de saida e ativada apenas depois de uma alteracao real.
- CPF/CNPJ, email e UF preservam as validacoes atuais do servidor.

### Dados da empresa

O formulario de empresa recebe o mesmo ciclo de dirty state e erros inline. A
interface passa a consumir os `fieldErrors` que a server action ja devolve, sem
alterar a autorizacao ou o escopo por empresa.

Logo continua sendo um fluxo separado porque possui upload, validacao de imagem
e confirmacao propria. Trocar o logo com sucesso nao deve marcar o formulario de
texto como alterado.

### Forma de recebimento

O formulario ja possui assinatura de alteracoes. O lote conecta essa assinatura
a protecao de navegacao e ao estado visual compartilhado.

- Trocar entre Pix direto e Asaas marca o formulario como alterado.
- Campos do Pix mostram `aria-invalid`, `aria-describedby` e foco no primeiro
  erro retornado.
- Alteracoes nao salvas nunca mudam a forma efetiva de cobranca.
- A referencia salva e atualizada somente depois da server action.
- Nenhuma chave Pix e enviada para analytics ou inserida na URL.

### Templates de etapas

O editor de template usa assinatura de nome, descricao, ordem, nomes das etapas
e dias previstos.

- Cancelar um template alterado pede confirmacao antes de descartar.
- Nome, etapa vazia e dias invalidos mostram erro junto ao controle.
- Reordenar ou remover etapa marca o rascunho como alterado.
- Salvar atualiza a referencia e fecha o editor como hoje.
- Identificadores visuais deixam de depender apenas do indice quando isso puder
  causar perda de foco durante reordenacao.

### Comandos da obra

Os comandos de obra permanecem curtos e transacionais; nao recebem uma barra de
salvamento de pagina.

- Adicionar etapa, gasto e ponto recebem labels, names e erros inline completos.
- Fechar explicitamente um dialog com dados significativos pede confirmacao de
  descarte.
- Fechar um dialog intocado continua imediato.
- Durante envio, fechamento e dupla submissao ficam bloqueados.
- Depois do sucesso, o comando limpa os campos e atualiza a pagina.
- O diario preserva seu rascunho atual e nao sera reescrito.

## Validacao e acessibilidade

- Server actions continuam sendo a autoridade final.
- Validacao cliente cobre obrigatoriedade e limites basicos para feedback rapido.
- Erros usam `aria-invalid`, `aria-describedby` e regiao `aria-live` adequada.
- Todo input possui `label`, `name`, `autocomplete` e `inputMode` quando cabivel.
- Campos moveis mantem fonte suficiente para evitar zoom automatico.
- Botoes por icone possuem nome acessivel e icones decorativos usam
  `aria-hidden`.
- Alvos de toque permanecem com pelo menos 44 px.
- Foco nunca termina escondido atras da barra fixa.
- Cor nao e o unico indicador de estado.

## Observabilidade e operacao

O sistema atual de logs estruturados, error boundaries, evento interno e alerta
por email e suficiente para a primeira fase comercial, desde que seja testado em
producao. Integrar Sentry fica como evolucao opcional quando o volume justificar
mais contexto de stack, sessoes e agrupamento de erros.

O release deve comprovar:

- alerta de error boundary chegando ao destino configurado;
- alerta de checkout/webhook chegando ao destino configurado;
- diagnostico autenticado sem falha critica;
- backup recente fora do projeto de producao;
- restauracao ensaiada em ambiente separado;
- logs da Vercel sem repeticao continua de erro ou webhook.

Nenhum teste de observabilidade pode incluir CPF, CNPJ, chave Pix, token publico
de orcamento ou credenciais.

## Identidade publica e itens externos

Identidade do fornecedor, contato publico, revisao juridica de Termos e
Privacidade e confirmacao financeira no painel Asaas nao podem ser inventados no
codigo. Eles entram no gate de release como itens externos obrigatorios, com
responsavel e evidencia.

O Prumo pode receber a tag tecnica `v1.0.0` quando codigo, CI, deploy e smoke
estiverem verdes. A declaracao comercial de lancamento exige tambem:

- nome legal ou empresarial confirmado pelo responsavel;
- email de suporte publico funcionando;
- Termos e Privacidade revisados com os dados verdadeiros;
- compra controlada com pagador diferente do recebedor;
- confirmacao de uma unica assinatura recorrente no Asaas;
- cancelamento e webhook conferidos no painel.

## Estrategia de testes

### Unitarios

- normalizacao e assinatura dos formularios;
- espacos irrelevantes nao criam dirty state;
- alteracoes reais, reordenacao e troca de provedor criam dirty state;
- referencia salva so muda depois de sucesso;
- mapeamento do primeiro erro para o campo correto.

### E2E

- criar cliente e seguir para novo orcamento;
- editar cliente, cancelar navegacao e salvar;
- editar empresa, corrigir erro inline e recarregar dados persistidos;
- alterar Pix, cancelar saida e salvar sem expor a chave;
- criar e reordenar template, cancelar descarte e salvar;
- fechar gasto ou ponto preenchido e escolher continuar editando;
- jornada principal de orcamento, aprovacao, obra e checkout permanece verde;
- ausencia de erro de console e overflow horizontal.

### QA visual

Capturas reais, sem mockups, em 375 x 812, 390 x 844, 768 x 1024 e 1440 x
900. Devem cobrir cliente alterado, erro inline, empresa salva, Pix pendente,
template reordenado e comando de obra com confirmacao de descarte.

## Gate da versao 1.0.0

### Gate tecnico

1. Typecheck, lint, testes, audit e build aprovados.
2. E2E de banco e navegador aprovado no CI.
3. QA mobile e desktop sem bloqueio critico ou alto.
4. Deploy de producao `Ready` e alias principal atualizado.
5. Smoke publico e autenticado aprovado.
6. Webhook sem token rejeitado e logs sem HTTP 500 recorrente.
7. Worktree limpo e commit de release identificado.

### Gate operacional

1. Alertas de producao testados.
2. Backup recente e restauracao ensaiada.
3. Identidade e contato publico preenchidos.
4. Termos e Privacidade revisados.
5. Compra, ativacao, upgrade e cancelamento conferidos no Asaas.

Se o gate tecnico passar e o operacional tiver item externo pendente, o codigo
pode ser publicado, mas o relatorio deve dizer explicitamente que o lancamento
comercial ainda depende desse item.

## SINAPI depois da V1

SINAPI Lite sera especificado em um documento proprio depois do gate da V1. A
direcao aprovada permanece:

- busca por codigo e descricao;
- UF e competencia obrigatorias;
- distincao entre insumo e composicao;
- custo de referencia com fonte visivel;
- margem ou ajuste antes de adicionar;
- snapshot no catalogo ou orcamento;
- historico imutavel;
- ingestao mensal validada;
- disponibilizacao inicial no Ultimate;
- nenhuma promessa publica antes de dados, UX e atualizacao estarem validados.

## Criterios de aceite

1. Formularios longos deixam claro se os dados estao salvos.
2. Navegacao com alteracoes persistiveis pede confirmacao.
3. Erros aparecem no campo correto e o primeiro fica visivel.
4. Comandos da obra nao descartam digitacao relevante silenciosamente.
5. Mobile nao apresenta zoom inicial, overflow ou acao coberta.
6. As jornadas atuais de pagamento, orcamento e obra nao sofrem regressao.
7. Fundacoes ja prontas nao sao reimplementadas.
8. Pendencias externas aparecem separadas de defeitos de codigo.
9. O gate tecnico e operacional produz uma decisao objetiva sobre `v1.0.0`.
10. SINAPI permanece uma evolucao isolada e honesta depois da V1.
