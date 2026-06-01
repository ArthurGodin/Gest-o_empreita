# Checklist de Lançamento - Gestão Empreita

Use este checklist antes de colocar clientes reais usando a aplicação.

## 1. Código e Deploy

- [ ] Branch de release criada a partir de uma árvore Git limpa.
- [ ] `npm run lint` passou.
- [ ] `npx tsc --noEmit` passou.
- [ ] `npm test` passou.
- [ ] `npm run build` passou.
- [ ] Staging publicado.
- [ ] Produção publicada.
- [ ] `NEXT_PUBLIC_APP_URL` aponta para o domínio correto em produção.

## 2. Supabase

- [ ] Todas as migrations aplicadas em staging.
- [ ] Todas as migrations aplicadas em produção.
- [ ] RLS habilitado nas tabelas públicas.
- [ ] Buckets criados: `company-logos`, `quotes-pdf`, `diary-photos`.
- [ ] Auth configurado com URL de produção e callback.
- [ ] Seed/demo validado em staging.

## 3. Fluxo Principal

- [ ] Criar conta.
- [ ] Fazer onboarding da empresa.
- [ ] Cadastrar cliente.
- [ ] Criar orçamento.
- [ ] Adicionar itens do catálogo.
- [ ] Enviar orçamento.
- [ ] Abrir link público em aba anônima/celular.
- [ ] Aprovar orçamento pelo link público.
- [ ] Converter orçamento aprovado em obra.
- [ ] Aplicar template de etapas.
- [ ] Adicionar diário com foto.
- [ ] Lançar gasto.
- [ ] Registrar ponto.
- [ ] Conferir margem no painel financeiro.

## 4. Segurança

- [ ] Link público não expõe custos internos.
- [ ] Link público não expõe ponto/equipe completa.
- [ ] Foto pública exige token válido.
- [ ] PDF público exige token válido.
- [ ] Usuário de uma empresa não enxerga dados de outra.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` existe só no servidor.
- [ ] `.env.local` não está versionado.

## 5. Comercial

- [ ] Landing promete apenas funcionalidades existentes.
- [ ] Página de preços publicada.
- [ ] Termos e privacidade acessíveis no rodapé.
- [ ] Roteiro de demonstração definido.
- [ ] Lista dos 5 primeiros pilotos definida.
- [ ] Preço inicial definido: R$ 197/mês.
- [ ] Mensagem de venda curta pronta.

## 6. Próxima Entrega Obrigatória

- [ ] Asaas sandbox criado.
- [ ] `ASAAS_API_KEY` configurada em staging.
- [ ] `ASAAS_WEBHOOK_TOKEN` configurado.
- [ ] Cobrança Pix de entrada criada ao virar obra.
- [ ] Webhook Asaas recebendo `PAYMENT_CONFIRMED`.
- [ ] Financeiro mostra recebido, pendente e atrasado.

## Mensagem de Venda Recomendada

> Estou abrindo 5 vagas para empreiteiras testarem um sistema que cria orçamento
> profissional, manda link para o cliente aprovar e organiza a obra com foto,
> gasto e margem. A ideia é tirar sua empresa do caderno/WhatsApp sem colocar um
> ERP pesado no caminho.
