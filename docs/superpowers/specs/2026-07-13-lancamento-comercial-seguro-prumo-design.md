# Lancamento comercial seguro do Prumo

## Objetivo

Deixar o Prumo pronto para iniciar vendas controladas com dinheiro real, sem
misturar esse trabalho com a futura reformulacao visual completa. Um cliente
deve conseguir conhecer o produto, escolher um plano, criar conta, pagar e
comecar a usar sem depender de contato manual com o fundador.

## Criterio de conclusao

O ciclo termina somente quando os caminhos publicos e autenticados essenciais
passarem por validacao automatizada e QA em celular e desktop, e quando a
documentacao operacional refletir o ambiente de producao.

## Escopo

### 1. Receita e ativacao

- Verificar checkout Pro e Ultimate, idempotencia e recuperacao de falhas.
- Verificar autenticacao do webhook e reconciliacao dos eventos do Asaas.
- Garantir que plano pago seja ativado apenas por confirmacao confiavel.
- Confirmar que cancelamento, atraso e estorno nao deixam acesso indevido.
- Manter dados sensiveis somente no servidor e mensagens de erro acionaveis.

### 2. Fidelidade comercial

- Comparar landing, precos e telas internas com as regras reais dos planos.
- Manter as promessas em uma unica fonte de verdade sempre que possivel.
- Remover ou corrigir afirmacoes que ainda dependam de operacao manual.
- Verificar limites do Gratis no servidor, nao apenas na interface.

### 3. Conversao e autosservico

- Revisar landing, precos, cadastro, login, onboarding e checkout como um funil.
- Corrigir bloqueios mobile, acessibilidade e navegacao que prejudiquem a venda.
- Garantir estados de carregamento, erro, vazio e recuperacao nos pontos criticos.
- Medir os eventos necessarios para trafego pago sem enviar dados financeiros ou
  pessoais desnecessarios a plataformas de anuncios.

### 4. Operacao de producao

- Atualizar o checklist de lancamento com o estado real de Asaas, Vercel,
  Supabase, email e Meta Ads.
- Registrar pendencias externas separadamente de defeitos de codigo.
- Preparar uma verificacao repetivel para cada novo deploy comercial.

## Direcao visual deste ciclo

O produto mantem a identidade atual: interface utilitaria, profissional e de
densidade media, com verde esmeralda como acento, superficies claras e texto em
tom tinta. Este ciclo corrige inconsistencias, alvos de toque, zoom, navegacao,
espacamento e hierarquia que afetem o uso. Ele nao redesenha todas as telas.

A reformulacao posterior tera especificacao propria para unificar landing e app,
definir tipografia, tokens, composicao, componentes, estados e comportamento em
todos os breakpoints sem colocar o lancamento atual em risco.

## Arquitetura e limites

- Preservar Next.js App Router, Supabase, Asaas e os componentes existentes.
- Nao criar migration sem necessidade comprovada pela auditoria.
- Reutilizar regras de planos de `src/lib/plans.ts` em vez de duplicar copy.
- Manter chamadas privilegiadas, chaves e reconciliacao de pagamento no servidor.
- Nao alterar contratos publicos de PDF, links de orcamento ou auth sem testes.
- Fazer mudancas pequenas e reversiveis, organizadas por risco.

## Fluxo de dados de assinatura

1. Usuario autenticado escolhe Pro ou Ultimate.
2. Servidor valida empresa, plano e documento do assinante.
3. Servidor reutiliza cobranca aberta valida ou cria checkout no Asaas.
4. Usuario escolhe o meio de pagamento no ambiente seguro do Asaas.
5. Webhook autenticado registra o evento de forma idempotente.
6. Somente evento de pagamento confiavel ativa o plano correspondente.
7. Diagnostico e logs permitem identificar falha sem expor segredos ao cliente.

## Erros e recuperacao

- Erros de configuracao devem orientar a operacao, sem revelar chaves.
- Erros de dados devem apontar o campo corrigivel pelo usuario.
- Falhas temporarias devem permitir nova tentativa sem gerar cobrancas duplicadas.
- Falha de analytics nunca pode bloquear cadastro, onboarding ou pagamento.
- Falha de email nunca pode invalidar uma operacao principal concluida.

## Validacao

- Typecheck, testes, build, lint e auditoria de dependencias.
- Testes unitarios dos estados de assinatura, webhook, planos e limites.
- QA publico: landing, precos, cadastro, login, termos e privacidade.
- QA autenticado: onboarding, inicio, orcamentos, obras, clientes, catalogo,
  financeiro, plano, checkout e configuracoes.
- Viewports minimos: 375x812, 390x844 e desktop 1440x900.
- Verificar overflow, zoom, alvos de toque, console, requests com falha e rotas 4xx/5xx.

## Fora deste ciclo

- Nova identidade visual completa.
- Novos modulos sem relacao direta com venda segura.
- Importacao XLSX nativa, SINAPI, multiusuario avancado ou suporte prometido como
  funcionalidade de software.
- Mudanca ampla de arquitetura ou reescrita do produto.
