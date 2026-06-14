# Checklist de Lançamento - Gestão Empreita

Use este checklist antes de colocar clientes reais usando a aplicação.

## 1. Código e Deploy

- [x] `npm run lint` passou em 2026-06-14.
- [x] `npm test` passou em 2026-06-14.
- [x] `npm run build` passou em 2026-06-14.
- [x] Produção publicada em `https://gestao-empreita.vercel.app`.
- [x] `NEXT_PUBLIC_APP_URL` aponta para a URL pública de produção.
- [ ] Branch/tag de release criada a partir de uma árvore Git limpa.

## 2. Supabase

- [x] Migrations principais aplicadas em produção.
- [x] RLS habilitado nas tabelas públicas do produto.
- [x] Auth configurado para produção.
- [x] Buckets usados pelo produto validados no fluxo real.
- [x] Reload de schema executado após migrations recentes.
- [ ] Registrar em release note a data exata da última migration aplicada.

## 3. Fluxo Principal

- [x] Criar conta.
- [x] Fazer onboarding da empresa.
- [x] Cadastrar cliente.
- [x] Criar orçamento.
- [x] Enviar orçamento.
- [x] Abrir link público em celular/navegador.
- [x] Cliente pedir mudança.
- [x] Criar revisão e reenviar.
- [x] Aprovar orçamento pelo link público.
- [x] Converter orçamento aprovado em obra.
- [x] Criar etapas da obra.
- [x] Marcar etapas como concluídas.
- [x] Concluir obra.
- [x] Liberar saldo.
- [x] Conferir financeiro.
- [ ] Rodar uma demo fresca antes de cada reunião comercial.

## 4. Cobrança Asaas

- [x] Asaas sandbox configurado.
- [x] `ASAAS_API_KEY` sandbox configurada.
- [x] `ASAAS_WEBHOOK_TOKEN` configurado.
- [x] Cobrança Pix de entrada criada ao virar obra.
- [x] Webhook Asaas validado com `PAYMENT_CONFIRMED`.
- [x] Webhook Asaas validado com `PAYMENT_RECEIVED`.
- [x] Eventos duplicados não duplicam baixa.
- [x] Token inválido retorna 401.
- [x] Evento atrasado não rebaixa cobrança já paga.
- [x] Saldo final gerado e baixado por webhook.
- [x] Financeiro mostra recebidos, pendentes e histórico.
- [ ] Conta Asaas produção aprovada.
- [ ] Chave API de produção configurada na Vercel.
- [ ] Webhook de produção criado no painel Asaas.
- [ ] Cobrança real de baixo valor validada.

## 5. Segurança

- [x] Link público não expõe custos internos.
- [x] Foto pública exige token válido.
- [x] PDF público exige token válido.
- [x] `SUPABASE_SERVICE_ROLE_KEY` fica somente no servidor.
- [x] `.env.local` não está versionado.
- [ ] Fazer QA cross-tenant antes de escalar para clientes sem acompanhamento.

## 6. Comercial

- [x] Landing promete funcionalidades existentes.
- [x] Página de preços publicada.
- [x] Termos e privacidade acessíveis no rodapé.
- [x] Roteiro de demonstração definido.
- [x] Preço inicial definido: R$ 197/mês.
- [x] Mensagem de venda curta pronta.
- [x] Estratégia sem custo fixo documentada.
- [ ] Lista dos 5 primeiros pilotos definida.
- [ ] Primeiro piloto pago marcado.

## 7. Critério Para Vender Hoje

Pode vender como piloto assistido se:

- a demo abre no domínio gratuito;
- o cliente entende orçamento, link público e aprovação;
- você deixa claro que Asaas está em sandbox até a cobrança real;
- você acompanha a primeira empresa de perto;
- você não promete automação completa de WhatsApp nem email profissional.

Não vender ainda como self-service de escala.

## Mensagem de Venda Recomendada

```text
Estou abrindo 5 vagas para empreiteiras testarem um sistema que cria orçamento profissional, manda link para o cliente aprovar pelo celular e organiza a obra com foto, gasto, margem e Pix.

A ideia é tirar sua empresa do caderno/WhatsApp sem colocar um ERP pesado no caminho. Eu configuro com você e coloco seu primeiro orçamento rodando.
```
