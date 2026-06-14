# Direcionamento Executivo - Gestão Empreita

Data: 2026-06-14

## Veredito Atual

O Gestão Empreita já é um produto demonstrável e vendável em piloto assistido.
Ele ainda não deve ser tratado como SaaS self-service de escala, mas está pronto
para ser apresentado a donos de pequenas empreiteiras com uma promessa clara:

> Criar orçamento profissional, aprovar pelo celular, virar obra e controlar
> execução, fotos, custos, margem e cobrança Pix sem planilha.

O ponto principal mudou. Antes, o risco era não existir fluxo completo. Agora o
risco é comercial: vender para a pessoa errada, prometer automação demais antes
da operação real e não acompanhar os primeiros clientes de perto.

## O Que Já Está Certificado

Fluxo validado em produção com Vercel, Supabase e Asaas sandbox:

1. Criação de cliente.
2. Criação de orçamento com itens, total, margem e validade.
3. Envio por link público e WhatsApp.
4. Visualização do cliente no celular.
5. Pedido de mudança pelo cliente.
6. Criação de revisão a partir de orçamento recusado.
7. Reenvio do orçamento revisado.
8. Aprovação digital pelo cliente.
9. Conversão do orçamento aprovado em obra.
10. Geração de cobrança Pix de entrada.
11. Baixa automática por webhook idempotente do Asaas.
12. Execução da obra com etapas.
13. Conclusão da obra.
14. Liberação de saldo final.
15. Baixa automática do saldo por webhook.
16. Financeiro mostrando recebido, pendente e histórico.
17. Link público mostrando pagamento completo ao cliente.

Também já foram tratados pontos de confiança importantes: PDF, página pública
404, onboarding, analytics, textos de produção, diagnóstico interno e checklist
sem custo fixo antes da primeira venda.

Documentos operacionais:

- [`CHECKLIST_LANCAMENTO.md`](./CHECKLIST_LANCAMENTO.md): prontidão antes de
  colocar clientes reais.
- [`primeira-venda-zero-custo.md`](./primeira-venda-zero-custo.md): roteiro
  para vender o primeiro piloto sem gastar antes.
- [`checklist-producao-asaas-resend-analytics.md`](./checklist-producao-asaas-resend-analytics.md):
  virada segura de Asaas, Resend e Analytics.

## Nível de Prontidão

### Pronto Para Vender Agora

- Demo guiada com cliente real.
- Piloto assistido com até 5 empresas.
- Uso do domínio gratuito `gestao-empreita.vercel.app`.
- WhatsApp como canal principal de envio, negociação e cobrança.
- Asaas sandbox para demonstração sem movimentar dinheiro real.
- Resend apenas para teste, suporte interno e alertas básicos.

### Não Vender Ainda Como Promessa

- Automação completa de WhatsApp.
- Email profissional para clientes sem domínio próprio verificado.
- Multiempresa, white-label ou subcontas Asaas.
- BI avançado.
- App nativo.
- Operação self-service sem acompanhamento.

### Bloqueio Para Cobrar Dinheiro Real

O único bloqueio técnico relevante para primeira cobrança real é a virada
controlada do Asaas sandbox para produção:

- conta Asaas de produção aprovada;
- chave API de produção criada;
- webhook de produção ativo;
- variáveis de produção atualizadas na Vercel;
- uma cobrança real de baixo valor testada e confirmada.

Esse passo deve ser feito somente quando houver um cliente piloto disposto a
pagar ou quando você for fazer um teste real controlado. Antes disso, manter
sandbox é correto porque preserva caixa.

## Proposta Comercial Inicial

Vender como piloto assistido, não como assinatura anônima.

- Oferta: "Eu configuro com você e coloco seu primeiro orçamento rodando hoje."
- Trial: 14 dias sem cartão.
- Preço alvo: R$ 197/mês.
- Primeira meta: 5 empresas pequenas usando de verdade.
- Condição de sucesso: pelo menos 1 orçamento enviado, 1 aprovação e 1 obra
  acompanhada com etapa, foto ou custo.

Se o cliente aceitar pagar depois do piloto, a prioridade passa a ser qualidade
operacional e suporte, não novas funcionalidades.

## Regra de Produto

Toda melhoria precisa aumentar pelo menos um destes indicadores:

1. tempo até o primeiro orçamento enviado;
2. taxa de aprovação do orçamento;
3. confiança do cliente final no link público;
4. controle de obra pelo prestador;
5. clareza de margem e dinheiro recebido;
6. chance de o dono pagar mensalidade.

Se uma ideia não ajuda nesses pontos, fica fora do ciclo atual.

## Próximos Alvos

### Alvo 1 - Primeira Venda Assistida

Preparar roteiro, demo kit e checklist para apresentar o produto em 20 minutos,
sem depender de feedback demorado de amigos.

Entrega esperada: uma demonstração repetível que mostra orçamento, link público,
aprovação, obra, Pix e financeiro sem improviso.

### Alvo 2 - Virada Asaas Produção

Quando existir cliente piloto ou teste real autorizado, trocar sandbox por
produção de forma controlada e registrar o resultado.

Entrega esperada: uma cobrança real de baixo valor confirmada no sistema.

### Alvo 3 - Confiança de Uso Diário

Refinar telas que o dono vai abrir toda semana: orçamentos, obra, diário,
financeiro e clientes.

Entrega esperada: menos dúvida, mais feedback visual e menos chance de erro em
mobile.

### Alvo 4 - Operação Comercial

Criar página curta de venda, roteiro de WhatsApp, FAQ e processo de onboarding
manual.

Entrega esperada: você conseguir prospectar 20 empresas sem explicar o produto
do zero toda vez.

## O Que Não Fazer Agora

- Comprar domínio antes da primeira venda.
- Pagar ferramenta de WhatsApp antes de provar venda manual.
- Criar planos demais.
- Construir dashboard executivo antes de uso recorrente.
- Refatorar módulo inteiro sem ganho direto no funil.
- Tentar atender construtora grande antes de dominar pequenas empreiteiras.

## Indicador de "Pronto Para Escalar"

O produto só deve sair de piloto assistido quando estes sinais existirem:

- 5 empresas testaram com acompanhamento.
- 3 empresas criaram orçamento sem você operar por elas.
- 2 empresas aprovaram obra real com cliente final.
- 1 empresa pagou pelo menos o primeiro mês.
- Nenhum erro recorrente em PDF, link público, webhook ou login.
- O roteiro de onboarding leva menos de 30 minutos.

Antes disso, o foco não é escala. É venda assistida, aprendizado real e caixa.
