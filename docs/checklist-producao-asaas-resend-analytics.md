# Checklist de produção: Asaas, Resend e Analytics

Data: 2026-06-12

Objetivo: deixar o Gestão Empreita vendável sem gastar antes da primeira venda.
O domínio próprio fica para depois; por enquanto o app usa
`https://gestao-empreita.vercel.app`.

## Estado atual recomendado

- Vercel em produção usando domínio gratuito.
- Web Analytics habilitado no projeto Vercel `gestao-empreita`.
- `@vercel/analytics` carregado no layout global.
- Speed Insights mantido como opcional por causa do limite do plano Hobby.
- Asaas em sandbox até existir cobrança real.
- Resend configurado para testes e notificações internas.
- WhatsApp como canal principal de venda, aprovação e cobrança.

## Vercel Analytics

### Já feito

- Dependência `@vercel/analytics` instalada.
- Componente `<Analytics />` montado em `web/src/app/layout.tsx`.
- Web Analytics habilitado via CLI:
  `vercel project web-analytics --format json`.

### Como validar depois do deploy

1. Fazer deploy de produção.
2. Abrir `https://gestao-empreita.vercel.app`.
3. Navegar por landing, login, app e link público.
4. Abrir Vercel > projeto `gestao-empreita` > Analytics.
5. Confirmar pageviews chegando.
6. Checar console do navegador: não deve aparecer warning de Web Analytics.

### Speed Insights

No plano Hobby, a Vercel permite Speed Insights em apenas um projeto por vez.
Nesta conta, a ativação retornou limite de plano.

Para evitar warning sem pagar nada, o app só carrega Speed Insights quando:

```env
NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=true
```

Use essa variável apenas se você liberar o recurso na Vercel para este projeto.

## Asaas sandbox

Variáveis atuais para teste:

```env
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=<chave sandbox>
ASAAS_WEBHOOK_TOKEN=<token forte sandbox>
```

Checklist de sandbox:

1. Conta sandbox aprovada o suficiente para gerar cobranças.
2. Chave API sandbox ativa.
3. Chave Pix sandbox criada.
4. Webhook sandbox ativo:
   - URL: `https://gestao-empreita.vercel.app/api/asaas/webhook`
   - API: `v3`
   - envio: não sequencial
   - token igual ao `ASAAS_WEBHOOK_TOKEN`
5. Eventos mínimos:
   - cobrança criada;
   - cobrança recebida/confirmada;
   - cobrança vencida;
   - cobrança cancelada/estornada, se disponível.
6. Teste no app:
   - cliente aprova orçamento;
   - prestador vira obra;
   - entrada Pix é gerada;
   - cobrança abre no Asaas;
   - webhook não fica pausado.

## Asaas produção

Só trocar para produção quando for cobrar dinheiro real.

Variáveis de produção:

```env
ASAAS_API_URL=https://api.asaas.com/v3
ASAAS_API_KEY=<chave de produção>
ASAAS_WEBHOOK_TOKEN=<token forte diferente do sandbox>
```

Checklist de virada:

1. Conta Asaas produção aprovada.
2. Chave API de produção criada com nome claro.
3. Webhook recriado no painel de produção do Asaas.
4. Token de webhook diferente do sandbox.
5. Variáveis atualizadas na Vercel em `Production`.
6. Novo deploy de produção.
7. Cobrança real de baixo valor testada.
8. Logs da Vercel verificados por 30 minutos.
9. Webhook verificado no painel do Asaas sem penalização ou fila pausada.

## Resend sem domínio próprio

Estado recomendado agora:

- Não depender de email para fechar venda.
- Usar WhatsApp para envio de orçamento, revisão, aprovação e cobrança.
- Usar Resend apenas para teste e alerta interno.

Por quê:

- Email profissional para qualquer cliente exige domínio verificado.
- O domínio `resend.dev` serve para teste e tem restrições.
- Como domínio próprio custa dinheiro, ele entra depois da primeira venda.

Checklist atual:

1. `RESEND_API_KEY` configurada na Vercel.
2. Teste de envio recebido no seu Gmail.
3. Fluxo principal continua funcionando mesmo se email falhar.
4. Mensagens comerciais priorizam WhatsApp.

Depois da primeira venda:

1. Comprar domínio.
2. Criar subdomínio de envio, por exemplo `mail.seudominio.com`.
3. Verificar DNS no Resend.
4. Trocar remetente para
   `Gestão Empreita <notificacoes@mail.seudominio.com>`.
5. Testar Gmail e Outlook.
6. Monitorar rejeição, spam e taxa de entrega.

## Critério para começar piloto pago

Pode abordar cliente piloto quando estes itens estiverem verdes:

- orçamento público abre bem no celular;
- cliente aprova e pede ajuste;
- revisão preserva histórico;
- WhatsApp abre com mensagem pronta;
- obra nasce a partir do orçamento aprovado;
- Pix sandbox gera cobrança de entrada;
- PDF público baixa sem erro;
- página 404 pública orienta o cliente;
- Web Analytics registra visitas;
- logs de produção não mostram erro 500 recorrente.

## Rotina antes de cada demonstração

1. Criar cliente de teste.
2. Criar orçamento com 2 ou 3 itens reais.
3. Enviar pelo WhatsApp.
4. Abrir o link no celular.
5. Aprovar como cliente.
6. Virar obra.
7. Conferir entrada Pix e link público de acompanhamento.
8. Apagar dados de teste se forem de demonstração interna.
