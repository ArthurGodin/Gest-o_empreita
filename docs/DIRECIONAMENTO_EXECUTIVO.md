# Direcionamento Executivo - Gestão Empreita

Data: 2026-06-01

## Norte

Transformar o Gestão Empreita em um produto vendável para pequenas empreiteiras,
começando pelo fluxo que mais gera valor imediato:

1. Orçamento profissional.
2. Aprovação digital pelo cliente.
3. Conversão para obra.
4. Controle de execução com fotos, etapas, ponto e gastos.
5. Margem visível.
6. Cobrança Pix integrada.

O produto não deve tentar ser um ERP completo neste momento. A promessa precisa
ser mais afiada:

> Criar orçamento bonito, aprovar pelo celular e controlar obra sem planilha.

## Posição Atual

O MVP técnico já passou da fase de esqueleto. Existem módulos funcionais de
clientes, catálogo, orçamentos, link público, PDF, obras, diário, fotos, custos,
ponto e financeiro básico.

O risco principal deixou de ser "não existe produto" e virou:

- prometer mais do que a aplicação entrega;
- não ter cobrança real;
- não ter observabilidade de produção;
- não ter processo de piloto com clientes reais;
- acumular funcionalidades antes de validar disposição de pagamento.

## Prioridade Máxima

### 1. Produto vendável sem falsa promessa

Manter a landing e o discurso comercial focados no que já funciona:

- orçamento profissional;
- link de aprovação;
- obra controlada;
- margem estimada.

Não usar "Pix em um clique" como promessa pública até Asaas estar implementado
e validado.

### 2. Cobrança Asaas

Esta é a próxima entrega de maior impacto. Ela fecha o ciclo de valor:

orçamento aprovado -> obra -> entrada -> execução -> saldo -> financeiro.

Implementar em quatro cortes:

1. Fundação de schema, env vars e cliente Asaas.
2. Cobrança de entrada ao converter orçamento em obra.
3. Webhook idempotente e status de pagamento.
4. Saldo na entrega + financeiro com recebidos, pendentes e atrasados.

### 3. Observabilidade

Antes de clientes pagantes em volume:

- Sentry ou equivalente para exceções.
- Eventos de funil: signup, onboarding_done, quote_created, quote_sent,
  quote_approved, project_created, diary_added, cost_added, payment_created,
  payment_confirmed.
- Logs estruturados em server actions e webhooks.

### 4. Piloto pago

Não buscar escala ainda. Buscar 5 empresas pequenas e acompanhar de perto.

Critérios de piloto:

- O dono cria o primeiro orçamento em menos de 10 minutos.
- O cliente consegue aprovar sem ajuda.
- O dono volta no painel da obra durante a execução.
- Pelo menos uma obra tem custos lançados.
- O dono aceita pagar R$ 197/mês após o teste.

## Plano de 30 Dias

### Semana 1 - Endurecer versão vendável

- Congelar uma branch/release.
- Atualizar docs e seed demo.
- Revisar landing, signup, onboarding e dashboard.
- Criar checklist manual de QA.
- Publicar staging e produção.

Entrega esperada: produto demonstrável sem vergonha e sem promessa falsa.

### Semana 2 - Cobrança Pix Asaas

- Implementar schema de cobrança.
- Criar cliente Asaas a partir do cliente cadastrado.
- Gerar Pix de entrada ao virar obra.
- Mostrar cobrança no painel da obra.
- Rodar sandbox ponta a ponta.

Entrega esperada: primeira cobrança Pix criada pelo sistema.

### Semana 3 - Webhook + financeiro real

- Implementar webhook idempotente.
- Atualizar status de cobrança automaticamente.
- Criar visão de recebidos, pendentes e atrasados.
- Expor cobrança no link público do cliente.
- Adicionar ação de regenerar cobrança.

Entrega esperada: dinheiro pago no Asaas aparece no Gestão Empreita.

### Semana 4 - Piloto assistido

- Instalar com 5 empresas.
- Observar uso real sem defender o produto.
- Corrigir atritos de onboarding e mobile.
- Medir conversão de orçamento enviado para orçamento aprovado.
- Definir preço final do primeiro plano.

Entrega esperada: sinais claros de pagamento e lista curta de melhorias reais.

## O Que Não Fazer Agora

- Não criar estoque completo antes de validar cobrança.
- Não criar BI avançado antes de ter clientes usando financeiro básico.
- Não construir app nativo antes de testar PWA/offline.
- Não criar multi-empresa e white-label agora.
- Não adicionar subcontas Asaas no MVP inicial.
- Não gastar tempo com automações de WhatsApp pagas antes de provar retenção.

## Métricas Que Importam

- Tempo até primeiro orçamento criado.
- Orçamentos enviados por empresa por semana.
- Taxa de aprovação dos orçamentos enviados.
- Obras criadas a partir de aprovados.
- Obras com pelo menos um diário/foto.
- Obras com pelo menos um gasto lançado.
- Margem média visível por obra.
- Cobranças Pix criadas e confirmadas.
- Conversão trial -> pago.

## Preço Inicial

Começar simples:

- Trial: 14 dias sem cartão.
- Plano inicial: R$ 197/mês.
- Desconto anual: 2 meses grátis.

Não lançar três planos no começo. Plano único reduz decisão e acelera venda.
Planos Pro/Business entram depois que houver padrão de uso real.

## Padrão de Decisão

Quando houver dúvida entre duas funcionalidades, escolher a que:

1. reduz tempo para o primeiro orçamento aprovado;
2. ajuda o dono enxergar dinheiro ou margem;
3. reduz retrabalho operacional na obra;
4. aumenta chance de pagamento mensal.

Todo o resto fica para depois.
