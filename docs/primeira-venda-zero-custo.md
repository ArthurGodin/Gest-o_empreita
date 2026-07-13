# Primeira Venda Sem Custo

Este modo existe para vender o primeiro piloto sem comprar domínio, sem pagar
ferramenta extra e sem depender de email transacional profissional.

## Regra Principal

O caminho crítico da venda é:

1. WhatsApp.
2. Link público do orçamento.
3. Aprovação digital.
4. Obra criada no painel.
5. Pix Asaas.
6. Baixa automática no financeiro.

Email automático fica como melhoria pós-venda. Domínio próprio também.

## Fluxo Operacional

1. Cadastre o cliente com nome, WhatsApp e CPF/CNPJ válido.
2. Crie o orçamento com título claro e itens objetivos.
3. Salve e envie o orçamento.
4. Abra o link público e confira como o cliente vai ver no celular.
5. Envie no WhatsApp com uma mensagem curta:

```text
Oi, [Nome]. Segue o orçamento para você conferir pelo celular:
[link]

Se estiver tudo certo, é só aprovar no próprio link. Se quiser mudar algo, me mande por ali também.
```

6. Quando o cliente aprovar, abra o painel e confira o status aprovado.
7. Clique em virar obra.
8. Gere o Pix da entrada.
9. Envie o link Asaas ou o Pix copia e cola no WhatsApp:

```text
Orçamento aprovado. Segue a entrada Pix para reservarmos a execução:
[link de pagamento]

Assim que cair, eu já sigo com a programação da obra.
```

10. Aguarde a confirmação pelo webhook.
11. Confira a obra e o financeiro.
12. Durante a execução, registre pelo menos uma etapa, um diário/foto e um gasto.
13. Ao concluir, libere o saldo e acompanhe a baixa do pagamento final.

## Demonstração Sem Cobrar Dinheiro Real

Use Asaas sandbox para demonstrar o fluxo completo:

- orçamento aprovado;
- obra criada;
- Pix de entrada gerado;
- webhook de entrada confirmado;
- etapas concluídas;
- Pix de saldo liberado;
- webhook de saldo confirmado;
- financeiro mostrando pagamento completo.

Explique ao cliente: "Nesta demo o Pix é sandbox. Quando fecharmos o piloto, eu
ativo a produção do Asaas e faço uma cobrança real pequena para validar."

## Como o App Se Comporta Sem Domínio de Email

- `RESEND_API_KEY` pode existir, mas email profissional depende de domínio
  verificado.
- Sem domínio próprio, não dependa de email para aprovar, cobrar ou vender.
- WhatsApp é o canal principal até a primeira venda.

## Quando Gastar Dinheiro

Depois da primeira venda ou primeiro piloto comprometido:

1. Comprar ou usar um domínio próprio.
2. Verificar `mail.seudominio.com.br` no Resend.
3. Configurar:

```env
EMAIL_FROM=Prumo <contato@mail.seudominio.com.br>
```

4. Trocar Asaas sandbox por produção.
5. Fazer uma cobrança real de baixo valor.
6. Confirmar se o webhook marcou pagamento recebido no sistema.

## O Que Não Depende de Gasto Agora

- Criar orçamento.
- Aprovar pelo link público.
- Pedir mudança pelo link público.
- Criar revisão e reenviar.
- Converter em obra.
- Gerar Pix Asaas sandbox.
- Mostrar cobrança no link público.
- Baixar pagamento via webhook.
- Atualizar financeiro.

## Não Prometer Antes da Hora

Não prometa automação completa de WhatsApp, email profissional ou cobrança real
automática se o ambiente ainda estiver em sandbox. A promessa correta é:

> "O sistema já controla orçamento, aprovação, obra, Pix e financeiro. Para o
> piloto pago, a cobrança real é ativada com um teste controlado."
