# Checklist de lançamento - Prumo

Atualizado em 13/07/2026. Este documento separa o que está validado localmente do que já está efetivamente em produção.

## Estado atual

- [x] Produção pública em `https://gestao-empreita.vercel.app`.
- [x] Asaas de produção configurado e cobrança real já validada no fluxo anterior.
- [x] Planos Grátis, Pro e Ultimate revisados para prometer somente recursos existentes.
- [x] Checkout, webhook, cancelamento e proteção de plano endurecidos no código local.
- [x] `typecheck`, testes, `build`, `lint` e auditoria de dependências aprovados localmente em 13/07/2026.
- [x] Migrations `20260713000000`, `20260713000001` e `20260713000002` aplicadas no Supabase de produção.
- [x] Código de 13/07/2026 publicado na Vercel depois das migrations.
- [x] Smoke test público e autenticado executado na nova versão de produção.
- [ ] Pixel e Conversions API da Meta configurados e testados.
- [ ] Razão social ou nome do fornecedor e contato público de suporte/privacidade definidos.

## Bloqueadores para ligar anúncios

Não iniciar tráfego pago enquanto qualquer item abaixo estiver pendente:

- [x] Aplicar as migrations de segurança e faturamento antes do deploy.
- [x] Publicar a versão endurecida e confirmar que login, checkout e cancelamento abrem sem erro.
- [ ] Confirmar no Asaas que o webhook está ativo e sem entregas penalizadas.
- [ ] Configurar `NEXT_PUBLIC_META_PIXEL_ID` e `META_CONVERSIONS_ACCESS_TOKEN` na Vercel.
- [ ] Validar `PageView`, `Lead`, `CompleteRegistration` e `Subscribe` nos Eventos de Teste da Meta.
- [ ] Informar publicamente quem fornece o serviço e um canal funcional de atendimento e privacidade.
- [ ] Fazer uma compra controlada com outro pagador e confirmar uma única assinatura, uma única cobrança e a ativação do plano correto.

## Supabase

- [x] RLS habilitado nas tabelas públicas principais.
- [x] Auth e storage usados pelo produto configurados.
- [x] Proteção contra alteração de plano pelo cliente criada na migration de 13/07/2026.
- [x] Campos de checkout pendente separados da assinatura ativa na migration.
- [x] Aplicar todas as migrations pendentes em produção.
- [x] Registrar migrations e deployment no relatório de auditoria de 13/07/2026.
- [ ] Fazer QA entre duas empresas para confirmar isolamento de clientes, obras, orçamentos, custos e cobranças.

## Assinatura Prumo

- [x] Checkout reutiliza link pendente e bloqueia criação concorrente.
- [x] Pagamento de upgrade não apaga a assinatura ativa antes da confirmação.
- [x] Webhook antigo ou fora de ordem não rebaixa um plano superior.
- [x] Upgrade pago cancela a assinatura recorrente anterior.
- [x] Proprietário pode cancelar a assinatura dentro do produto.
- [x] Repetição de eventos é tratada de forma idempotente.
- [ ] Validar em produção o ciclo Grátis -> Pro -> Ultimate -> cancelamento após o deploy.
- [ ] Confirmar no Asaas que não restou assinatura recorrente duplicada após upgrade.

## Fluxo principal

- [x] Cadastro e onboarding.
- [x] Cadastro de cliente.
- [x] Criação, PDF e envio de orçamento.
- [x] Aceite ou recusa pelo link público sem login.
- [x] Conversão manual do orçamento aprovado em obra.
- [x] Etapas, diário, equipe, custos e conclusão da obra.
- [x] Entrada, saldo e visão financeira.
- [x] Validar landing, login, app, menu, plano, diagnóstico e checkout em viewport móvel na versão publicada.
- [ ] Repetir o fluxo completo com criação de orçamento e obra em celular real na versão publicada.
- [ ] Repetir o fluxo completo em desktop na versão publicada.

## Segurança e operação

- [x] `SUPABASE_SERVICE_ROLE_KEY`, chaves Asaas e token de webhook permanecem no servidor.
- [x] Link, PDF e foto públicos exigem token válido.
- [x] Alertas operacionais existem para falhas críticas de cobrança.
- [x] Dependências sem vulnerabilidades conhecidas pelo `npm audit` local.
- [ ] Monitorar logs da Vercel e entregas do webhook durante as primeiras vendas.
- [ ] Definir responsável por responder alertas e prazo máximo de atendimento.
- [ ] Manter backup e procedimento de recuperação do Supabase documentados.

## Comercial e jurídico

- [x] Landing e preços sem depoimentos, números ou garantias inventadas.
- [x] Limites e recursos dos três planos alinhados ao código atual.
- [x] Termos e privacidade publicados.
- [ ] Preencher identidade pública do fornecedor e contato de suporte/privacidade.
- [ ] Fazer revisão jurídica dos Termos, Privacidade e política de cancelamento antes de escalar.
- [ ] Definir suporte inicial, política de incidentes e processo de reembolso quando exigido por lei.

## Autorização de lançamento

O Prumo está liberado para **vendas assistidas**, com acompanhamento das primeiras empresas. Tráfego pago ainda deve esperar Meta Ads, identificação pública do fornecedor e a compra controlada final com outro pagador.
