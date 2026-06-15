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

## Certificação atual do fluxo financeiro

Validado em produção em 2026-06-14, usando Asaas sandbox:

1. Orçamento aprovado virou obra.
2. Cobrança Pix de entrada foi criada.
3. Webhook do Asaas baixou a entrada como recebida.
4. Eventos duplicados foram ignorados sem duplicar baixa.
5. Evento atrasado não rebaixou cobrança já paga.
6. Token inválido retornou 401 e não gravou evento.
7. Todas as etapas da obra foram concluídas.
8. Saldo final foi liberado.
9. Webhook baixou o saldo como recebido.
10. Painel da obra, financeiro e link público ficaram consistentes.

Conclusão: o ciclo técnico está certificado para demonstração e piloto assistido.
O que ainda falta para dinheiro real não é código novo; é troca controlada das
credenciais de sandbox para produção e teste real de baixo valor.

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
4. Token de webhook forte, diferente do sandbox e diferente da API key.
5. Variáveis atualizadas na Vercel em `Production`.
6. Novo deploy de produção.
7. Criar cliente real de teste com dados válidos.
8. Criar cobrança real de baixo valor, sempre com parcela de pelo menos R$ 5,00.
9. Confirmar pagamento real.
10. Conferir se o webhook marcou a cobrança como recebida no Gestão Empreita.
11. Verificar logs da Vercel por 30 minutos.
12. Verificar no painel do Asaas se o webhook não ficou penalizado ou pausado.
13. Registrar o resultado no histórico de QA do projeto.

Regra de segurança:

- não reutilizar token de webhook sandbox;
- não expor API key em print, commit, documentação ou chat;
- não testar produção com orçamento de cliente que não autorizou;
- não fazer várias cobranças reais antes de uma cobrança pequena funcionar;
- não gerar cobrança real abaixo de R$ 5,00, pois o Asaas rejeita;
- se o webhook falhar, pausar venda e corrigir antes de repetir.

Fontes oficiais usadas como referência operacional:

- A documentação do Asaas orienta webhook com token de autenticação forte e
  envio do token no header `asaas-access-token`.
- A documentação do Asaas informa que a documentação interativa aponta para
  sandbox; produção deve usar credenciais de produção.

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

Observação operacional:

- O domínio `resend.dev` é apenas para testes e possui restrições de envio.
- Para enviar email profissional para clientes, o Resend exige domínio próprio
  verificado. Portanto, sem domínio próprio, WhatsApp continua sendo o canal
  principal e correto para venda.

## Critério para começar piloto pago

Pode abordar cliente piloto quando estes itens estiverem verdes:

- orçamento público abre bem no celular;
- cliente aprova e pede ajuste;
- revisão preserva histórico;
- WhatsApp abre com mensagem pronta;
- obra nasce a partir do orçamento aprovado;
- Pix sandbox gera cobrança de entrada e saldo;
- webhooks de entrada e saldo baixam pagamento automaticamente;
- PDF público baixa sem erro;
- página 404 pública orienta o cliente;
- Web Analytics registra visitas;
- logs de produção não mostram erro 500 recorrente.

Se todos esses itens estiverem verdes, o produto está pronto para venda
assistida. Para venda com dinheiro real, execute a virada do Asaas produção
antes de prometer cobrança ativa ao cliente.

## Rotina antes de cada demonstração

1. Criar cliente de teste.
2. Criar orçamento com 2 ou 3 itens reais.
3. Enviar pelo WhatsApp.
4. Abrir o link no celular.
5. Aprovar como cliente.
6. Virar obra.
7. Conferir entrada Pix e link público de acompanhamento.
8. Apagar dados de teste se forem de demonstração interna.
