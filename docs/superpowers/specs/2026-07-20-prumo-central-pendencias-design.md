# Prumo Central de Pendencias - Design

Data: 2026-07-20
Status: aprovado para planejamento

## Objetivo

Transformar o bloco simples de proximas acoes do Inicio numa fila operacional
confiavel. A Central de Pendencias deve mostrar apenas situacoes comprovadas
pelos dados do Prumo e levar o usuario diretamente ao ponto de resolucao.

O recurso deve aumentar recorrencia de uso sem criar ruido, tarefas artificiais
ou alertas baseados em suposicoes.

## Escopo

O primeiro corte inclui:

- resumo compacto das pendencias no Inicio;
- pagina autenticada `/app/pendencias` com a lista completa;
- filtros por Orcamentos, Obras e Cobrancas;
- classificacao deterministica de prioridade;
- links diretos para resolver cada situacao;
- analytics sem dados pessoais ou financeiros;
- testes unitarios, E2E e QA responsivo.

Nao inclui:

- nova tabela de tarefas ou notificacoes;
- atribuicao de responsavel;
- dispensar, arquivar ou concluir pendencias manualmente;
- alertas por falta de atividade durante um numero arbitrario de dias;
- envio de email, push ou WhatsApp;
- mudanca nos planos Gratis, Pro e Ultimate.

## Abordagem escolhida

O Prumo calculara pendencias em tempo de leitura usando os dados que ja busca
para orcamentos, obras e cobrancas. Uma funcao pura recebera esses registros e a
data atual do Brasil, retornando uma lista normalizada e ordenada.

Nao havera migration. A pendencia desaparece quando o estado real do produto e
resolvido. Isso evita divergencia entre uma tarefa marcada manualmente e a obra,
proposta ou cobranca que a originou.

## Pendencias objetivas

### Cobranca vencida

- Condicao: status `overdue`, ou status `pending` com `due_date` anterior a hoje.
- Prioridade: critica.
- Destino: detalhe da obra relacionada.
- Contexto: tipo da cobranca, vencimento e valor.

O fallback por data protege o usuario quando o provedor ainda nao atualizou o
status local, sem transformar cobrancas futuras em alerta.

### Obra com prazo vencido

- Condicao: obra em `planning`, `in_progress` ou `paused`, com `ends_on` anterior
  a hoje.
- Prioridade: alta.
- Destino: detalhe da obra.
- Contexto: nome da obra, cliente quando disponivel e data prevista.

### Entrega aprovada sem cobranca de saldo

- Condicao: obra com `delivery_approved_at` preenchido e sem cobranca do tipo
  `saldo`, desde que a obra nao esteja cancelada.
- Prioridade: alta.
- Destino: detalhe da obra, onde o saldo pode ser gerado.
- Contexto: nome da obra e data da aprovacao da entrega.

Se os dados disponiveis nao permitirem comprovar a ausencia da cobranca, essa
pendencia nao sera emitida.

### Orcamento aprovado sem obra

- Condicao: status efetivo `approved` e `project_id` ausente.
- Prioridade: normal.
- Destino: detalhe do orcamento.
- Contexto: numero, titulo, cliente e data da aprovacao.

### Proposta expirada sem decisao

- Condicao: status efetivo `expired`, sem aprovacao ou recusa.
- Prioridade: normal.
- Destino: detalhe do orcamento.
- Contexto: numero, titulo, cliente e validade.

## Modelo normalizado

Cada item calculado tera:

- identificador estavel derivado do tipo e da entidade;
- tipo da pendencia;
- categoria `quotes`, `projects` ou `billing`;
- prioridade `critical`, `high` ou `normal`;
- titulo curto e explicacao objetiva;
- rota autenticada de resolucao;
- data de referencia para ordenacao;
- metadados de apresentacao estritamente tipados, como valor ou vencimento.

O dominio nao retornara JSX. Icones, cores e texto visual complementar ficarao
na camada de apresentacao.

## Ordenacao

A ordem sera:

1. prioridade critica;
2. prioridade alta;
3. prioridade normal;
4. dentro da mesma prioridade, data de referencia mais antiga;
5. identificador estavel como desempate final.

Essa ordem precisa ser independente da ordem recebida das consultas.

## Inicio

O bloco atual `Proximas acoes` sera substituido por `Pendencias` quando houver
dados operacionais. Ele mostrara:

- total aberto;
- contagem por prioridade quando relevante;
- no maximo 5 itens;
- motivo, contexto e indicador textual de prioridade;
- acao `Ver todas` para `/app/pendencias`.

As orientacoes de primeira ativacao continuam separadas. Em uma empresa vazia,
o Prumo nao deve chamar a ausencia de clientes ou propostas de pendencia.

Quando nao houver pendencias, o bloco exibira um estado compacto e positivo,
sem ocupar espaco excessivo.

## Pagina completa

A rota `/app/pendencias` usara o shell autenticado existente e layout compacto.
Ela tera:

- titulo e resumo da quantidade aberta;
- filtros `Todas`, `Orcamentos`, `Obras` e `Cobrancas`;
- filtro refletido em `?categoria=`;
- lista completa ordenada;
- acao direta por item;
- estado vazio geral e estado vazio por filtro;
- link contextual para a Central de Ajuda quando necessario.

Filtros invalidos devem cair em `Todas`, sem erro ou redirecionamento em loop.

## Apresentacao e acessibilidade

- mobile first, sem tabela horizontal;
- linhas compactas com alvo de toque minimo de 44 px;
- prioridade comunicada por texto e icone, nunca apenas por cor;
- icones Lucide e tokens visuais existentes do Prumo;
- foco visivel e navegacao completa por teclado;
- textos longos com quebra ou truncamento controlado;
- cards com raio maximo coerente com o design system atual;
- sem modais, animacoes decorativas ou grandes espacos vazios.

## Dados e seguranca

As consultas continuam protegidas pelo tenant e pelas politicas RLS atuais. A
funcao de dominio recebe apenas registros ja autorizados.

Analytics permitidos:

- `pendency_center_opened`: categoria selecionada e contagem limitada;
- `pendency_clicked`: tipo, categoria e prioridade.

Analytics proibidos:

- nome de cliente ou obra;
- titulo ou numero de orcamento;
- valor, documento, telefone ou email;
- IDs de banco;
- datas especificas.

Esses eventos nao serao conversoes da Meta.

## Erros e degradacao

Falhas nas consultas seguem o error boundary autenticado existente. A funcao de
dominio nao engole dados invalidos silenciosamente: entradas incompletas so
deixam de gerar uma regra quando a comprovacao daquela regra depende do campo
ausente.

Nao sera exibida uma contagem parcial como se fosse completa quando uma consulta
falhar.

## Testes

### Unitarios

- cada regra positiva;
- limite exato de datas usando o fuso brasileiro;
- `pending` vencida pelo campo `due_date`;
- cobranca futura e recebida nao geram pendencia;
- obra concluida ou cancelada nao gera atraso;
- entrega aprovada com saldo existente nao gera pendencia;
- orcamento aprovado com obra nao gera pendencia;
- rejeitado nao vira expirado pendente;
- ordenacao deterministica;
- ausencia de mutacao das entradas.

### Integracao e E2E

- Inicio mostra resumo e limite de 5 itens;
- pagina completa abre e filtra pela URL;
- filtro invalido usa `Todas`;
- clique navega para a entidade correta;
- estado vazio claro;
- payload de analytics nao contem dados proibidos;
- sem overflow em 375, 390, 768 e 1440 px;
- navegacao por teclado e foco visivel.

### Gates

- testes focados;
- suite Vitest completa;
- typecheck;
- lint;
- build de producao;
- audit de dependencias;
- Playwright desktop e mobile;
- QA visual no app real;
- CI, deploy e smoke em producao.

## Criterios de aceite

O recurso esta concluido quando:

- todas as 5 regras geram apenas pendencias comprovadas;
- o Inicio permanece compacto e util para empresas vazias ou ativas;
- a pagina completa funciona em mobile e desktop;
- resolver o estado real remove a pendencia sem acao manual adicional;
- analytics nao expone conteudo operacional;
- nenhum plano, pagamento, login, PDF ou politica RLS e alterado;
- todos os gates passam e a producao e verificada.

