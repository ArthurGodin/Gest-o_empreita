# Produção do Prumo

Este é o procedimento de publicação. A ordem importa porque o código de faturamento de 13/07/2026 depende de novas colunas no Supabase.

## Ordem obrigatória

1. Aplicar as migrations pendentes no Supabase de produção.
2. Confirmar que a migration `20260713000001_saas_billing_hardening.sql` foi aplicada sem erro.
3. Publicar o diretório `web` na Vercel.
4. Executar o smoke test público e autenticado.
5. Só então liberar checkout e aquisição de clientes.

Nunca publique essa versão do código antes da migration: checkout e webhook consultam os novos campos de pagamento pendente.

## Aplicar migrations

Com acesso ao projeto Supabase de produção:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref cpvhtozthoquawjreipk
npx supabase@latest migration list --linked
npx supabase@latest db push --linked
```

O CLI solicitará autenticação e, quando necessário, a senha do banco. Não coloque token ou senha no repositório. Depois do `db push`, execute novamente `migration list --linked` e confirme que a migration local e a remota aparecem na mesma linha.

## Variáveis obrigatórias na Vercel

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Aplicação

- `NEXT_PUBLIC_APP_URL=https://gestao-empreita.vercel.app`

### Asaas de produção

- `ASAAS_API_KEY`
- `ASAAS_API_URL=https://api.asaas.com/v3`
- `ASAAS_WEBHOOK_TOKEN`

O webhook do Asaas deve apontar para:

```text
https://gestao-empreita.vercel.app/api/asaas/webhook
```

O token configurado no painel Asaas deve ser exatamente o mesmo de `ASAAS_WEBHOOK_TOKEN`. Use um token diferente da chave de API e nunca o exponha no navegador.

### Meta Ads

- `NEXT_PUBLIC_META_PIXEL_ID`
- `META_CONVERSIONS_ACCESS_TOKEN`
- `META_TEST_EVENT_CODE` somente durante a validação
- `META_GRAPH_API_VERSION` opcional

Não ligar campanhas de conversão antes de testar os eventos no Events Manager e remover `META_TEST_EVENT_CODE` da produção.

### Email e alertas

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ALERT_EMAIL_TO`

`ALERT_EMAIL_TO` deve chegar a alguém que acompanhe checkout e webhook durante o lançamento.

## Publicar na Vercel

O projeto Vercel usa `web` como diretório raiz. Depois da migration e da conferência das variáveis, publique a versão de produção pelo painel ou pela CLI já vinculada ao projeto.

## Smoke test sem gerar cobrança indevida

1. Abrir landing, preços, login, cadastro, termos e privacidade em celular e desktop.
2. Entrar com uma conta de teste e abrir Início, Orçamentos, Obras, Clientes, Caixa, Configurações e Planos.
3. Confirmar que a tela de planos mostra o plano atual e que o botão de checkout abre sem erro de banco.
4. Não concluir uma nova assinatura apenas para testar navegação.
5. No Asaas, confirmar que webhook e assinatura ativa esperada estão corretos.
6. Conferir logs da Vercel sem respostas 500 e sem repetição contínua de webhook.

## Teste financeiro controlado

Antes do primeiro anúncio, faça uma única compra controlada usando um pagador diferente do recebedor. Confirme:

- um único link de pagamento;
- uma única assinatura recorrente;
- ativação automática do plano pago;
- upgrade sem cobrança recorrente duplicada;
- cancelamento dentro do Prumo refletido no Asaas;
- nenhum rebaixamento causado por evento antigo.

Registre horário, usuário, plano, identificadores Asaas e resultado, sem salvar documentos pessoais ou chaves no repositório.
