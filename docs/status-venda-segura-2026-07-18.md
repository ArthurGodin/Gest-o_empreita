# Status de Venda Segura - Prumo

Data: 18/07/2026.

## Decisão

O Prumo está tecnicamente liberado para vendas assistidas: demonstrar, cadastrar
pilotos, aceitar clientes iniciais e acompanhar cada ativação de perto.

Ainda não é prudente escalar anúncios sem supervisão porque existem itens
externos que dependem de painel, domínio, política comercial e evidência
operacional fora do código.

## O que já está forte

- Produção publicada em `https://gestao-empreita.vercel.app`.
- Planos Grátis, Pro e Ultimate revisados para prometer recursos existentes.
- Checkout SaaS usa link de pagamento Asaas sem gerar boleto recorrente antigo
  automaticamente no app.
- Webhook Asaas ativa plano pago e baixa cobranças com idempotência.
- Cancelamento e upgrade evitam rebaixamento indevido por evento antigo.
- SINAPI Ultimate publicado com busca oficial por UF no editor de orçamento.
- Monitor operacional diário protege webhook, checkout, pagamentos,
  assinaturas e atualização SINAPI.
- Alertas operacionais são privados, sanitizados e enviados para o email
  configurado.
- Build, typecheck, lint, testes unitários, QA mobile/desktop e smoke de
  produção foram aprovados no ciclo de 17/07/2026.

## O que ainda depende de ação externa

- Verificar um domínio no Resend e substituir `EMAIL_FROM` por um remetente
  profissional, por exemplo `Prumo <contato@mail.seudominio.com.br>`.
- Confirmar no painel Asaas que o webhook está ativo, sem entregas falhando e
  sem recorrências duplicadas.
- Publicar identidade do fornecedor, contato de suporte e contato de
  privacidade.
- Registrar uma compra controlada com pagador diferente, sem salvar documentos
  pessoais no repositório.
- Validar Pixel e Conversions API com quem vai operar tráfego pago.
- Definir rotina de resposta quando o monitor operacional enviar alerta.

## Regra prática para vender agora

Pode vender em modo assistido:

1. Fazer demo com fluxo real de orçamento, aceite, obra e financeiro.
2. Acompanhar o primeiro upgrade pago manualmente no painel Asaas e no Prumo.
3. Confirmar que o plano foi liberado automaticamente.
4. Registrar apenas evidência técnica sanitizada: horário, plano, status Asaas
   e status Prumo.
5. Manter acompanhamento diário dos logs, webhook e email de alerta.

Evite prometer:

- email transacional profissional antes do domínio Resend verificado;
- ERP completo;
- importação em lote de clientes, obras ou orçamentos;
- XLSX nativo;
- automação de WhatsApp.

## Próxima fila de desenvolvimento

1. Painel interno simples de saúde operacional para o dono do produto, sem
   expor PII: último cron, estado geral e alertas abertos.
2. Auditoria UX/UI completa com foco em mobile real: editor de orçamento,
   detalhe de obra, financeiro e configurações.
3. Importação CSV assistida para clientes e catálogo próprio, com validação
   antes de gravar.
4. Exportação XLSX nativa no Ultimate, quando houver demanda real de contador
   ou cliente pagante.
5. Biblioteca de modelos prontos por tipo de obra para acelerar primeira
   proposta.

## Sol

Sol não é necessário para tarefas operacionais objetivas como DNS, segredos,
smoke, logs e conciliação, porque a qualidade vem de verificação concreta.

Sol é recomendado para o próximo ciclo de UX/UI, porque ali há muitas decisões
de hierarquia visual, densidade mobile, estados vazios, microcopy e
consistência entre landing e app.
