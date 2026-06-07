# Primeira Venda Sem Custo

Este modo existe para vender o primeiro piloto sem comprar dominio, sem pagar
ferramenta extra e sem depender de email transacional profissional.

## Regra principal

O caminho critico da venda e:

1. WhatsApp
2. Link publico do orcamento
3. Aprovacao digital
4. Obra criada no painel
5. Pix Asaas

Email automatico fica como melhoria pos-venda.

## Fluxo operacional

1. Cadastre o cliente com nome, WhatsApp e CPF/CNPJ valido.
2. Crie o orcamento com titulo claro e itens objetivos.
3. Clique em salvar e enviar.
4. Copie o link publico.
5. Envie no WhatsApp com uma mensagem curta:

```text
Oi, [Nome]. Segue o orcamento para voce conferir e aprovar pelo celular:
[link]

Depois que aprovar, eu gero a entrada Pix e ja combinamos o inicio da obra.
```

6. Quando o cliente aprovar, abra o painel e confira o status aprovado.
7. Clique em virar obra.
8. Gere o Pix da entrada.
9. Copie o link Asaas ou o Pix copia e cola.
10. Envie no WhatsApp:

```text
Orcamento aprovado. Segue a entrada Pix para reservarmos a execucao:
[link de pagamento]
```

11. Confirme o pagamento no Asaas sandbox ou aguarde o webhook em producao.
12. Acompanhe o financeiro pelo painel.

## Como o app se comporta sem dominio de email

- `RESEND_API_KEY` pode existir, mas notificacoes automaticas so sao enviadas
  quando `EMAIL_FROM` tambem estiver configurado.
- Sem `EMAIL_FROM`, o app registra no log que mandaria o email, mas nao chama
  o Resend.
- Isso evita o bloqueio do remetente `onboarding@resend.dev`, que so permite
  email de teste para o endereco da conta Resend.

## Quando gastar dinheiro

Depois da primeira venda ou primeiro piloto comprometido:

1. Compre ou use um dominio proprio.
2. Verifique `mail.seudominio.com.br` no Resend.
3. Configure:

```env
EMAIL_FROM=Gestao Empreita <contato@mail.seudominio.com.br>
```

4. Troque o webhook Asaas do ngrok para a URL publica definitiva.

## O que nao depende de gasto agora

- Criar orcamento.
- Aprovar pelo link publico.
- Converter em obra.
- Gerar Pix Asaas sandbox.
- Mostrar cobranca no link publico.
- Atualizar financeiro via webhook local ou ambiente publicado.

## Ponto de atencao

Ngrok gratuito pode trocar a URL ou responder 404 se o tunel cair. Para uma
demonstracao importante, abra o ngrok antes do teste e atualize o webhook do
Asaas com a URL atual.
