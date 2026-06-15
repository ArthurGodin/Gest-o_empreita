# Relatório E2E - 2026-06-15

Ambiente testado: `http://127.0.0.1:3100` apontando para as credenciais atuais do projeto.

## Resultado

Status: aprovado para continuar a preparação de piloto assistido.

O fluxo principal passou:

1. Login em conta QA.
2. Criação de orçamento para cliente existente.
3. Cadastro de item com total de R$ 20,00.
4. Envio do orçamento e geração de link público.
5. Abertura do link público como cliente.
6. Aprovação do orçamento.
7. Conversão do orçamento aprovado em obra.
8. Criação automática de etapas pelo modelo.
9. Criação de cobrança Pix de entrada de R$ 6,00.
10. Exibição de Pix copia e cola e link "Abrir cobrança".
11. PDF público retornando `200 OK` e `content-type: application/pdf`.

## Correção aplicada

Foi encontrado um erro real no E2E anterior: orçamento de R$ 10,00 com entrada de 30% gerava tentativa de Pix de R$ 3,00, mas o Asaas rejeita cobranças abaixo de R$ 5,00.

Correção feita:

- validação centralizada de valor mínimo do Pix Asaas;
- bloqueio na tela de "Virar obra";
- bloqueio no server action de conversão;
- bloqueio defensivo antes de chamar a API do Asaas;
- mensagem amigável no painel quando uma cobrança antiga abaixo do mínimo tenta gerar Pix;
- testes unitários cobrindo entrada e saldo abaixo do mínimo.

Validação da correção:

- cobrança antiga de R$ 3,00 agora mostra: "Cobrança Pix precisa ser de pelo menos R$ 5,00.";
- fluxo válido de R$ 20,00 gerou entrada Pix de R$ 6,00 corretamente.

## Comandos executados

```bash
npm test
npm run lint
npm run build
```

Resultado:

- 12 arquivos de teste passaram;
- 44 testes passaram;
- lint passou;
- build Next.js passou.

## Limite atual

Ainda não foi feita cobrança real em dinheiro.

Motivo: o ambiente atual está configurado para Asaas sandbox. Para cobrança real, a Vercel precisa receber:

```env
ASAAS_API_URL=https://api.asaas.com/v3
ASAAS_API_KEY=<chave de produção do Asaas>
ASAAS_WEBHOOK_TOKEN=<token forte de produção>
```

Depois disso é obrigatório criar o webhook no painel Asaas produção:

- URL: `https://gestao-empreita.vercel.app/api/asaas/webhook`
- API: `v3`
- envio: não sequencial
- token: exatamente igual ao `ASAAS_WEBHOOK_TOKEN`

## Observação sobre a chave Pix 06024377339

A chave `06024377339` pode ser usada como dado do cliente/pagador no teste controlado, mas o recebedor da cobrança é a conta Asaas dona da API key configurada.

Ou seja: o dinheiro real cai na conta Asaas vinculada à API key de produção, não em uma chave Pix digitada no orçamento.

## Próximo passo recomendado

1. Commitar e publicar esta correção.
2. Esperar deploy de produção ficar `Ready`.
3. Repetir o E2E em `https://gestao-empreita.vercel.app`.
4. Só depois trocar Asaas para produção e fazer uma cobrança real pequena, de pelo menos R$ 5,00.
