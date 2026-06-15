# Pix direto do empreiteiro

## Objetivo

Permitir que cada empreiteiro receba pagamentos das obras na propria chave Pix, sem precisar criar conta Asaas, mexer com API key ou entender integracao tecnica no primeiro uso do SaaS.

## Decisao de produto

O modo recomendado para lancamento e **Pix direto**:

- o empreiteiro configura a propria chave Pix em `Configuracoes`;
- o sistema gera QR Code Pix e Pix copia-e-cola com valor fechado da parcela;
- o cliente paga no app do banco;
- o empreiteiro confirma manualmente a baixa no painel da obra;
- o financeiro passa a considerar a parcela como recebida.

Asaas continua existindo como modo avancado para automacao futura, mas nao deve ser requisito para um cliente comprar e usar o SaaS.

## Fluxo

1. Empreiteiro configura tipo de chave, chave, nome do recebedor e cidade.
2. Ao virar orcamento aprovado em obra, o sistema cria entrada e saldo.
3. Para a entrada, o sistema tenta gerar Pix pelo provedor preferido da empresa.
4. Se a empresa usa Pix direto, o app gera BR Code e QR Code sem chamar API externa.
5. No link publico, o cliente ve QR Code, copia-e-cola e orientacao clara de pagamento.
6. No painel da obra, o empreiteiro pode marcar a parcela como paga apos conferir o extrato.
7. O saldo segue protegido ate entrega aprovada ou liberacao manual.

## Dados

Adicionar configuracoes em `companies`:

- `payment_provider`: `manual_pix` ou `asaas`;
- `pix_key_type`;
- `pix_key`;
- `pix_receiver_name`;
- `pix_receiver_city`;
- `pix_instructions`.

Adicionar auditoria em `billing_charges`:

- `payment_provider`;
- `paid_manually_at`;
- `paid_manually_by`;
- `manual_payment_note`.

## UX

A tela deve falar a lingua do empreiteiro: "Recebimento", "Pix da sua empresa", "nome que aparece no banco", "cidade do recebedor". Termos como API, webhook e Asaas ficam fora do fluxo principal.

No cliente final, a tela publica deve mostrar primeiro o QR Code, depois copia-e-cola, e evitar prometer baixa automatica quando o modo for manual.

## Riscos e limites

Pix direto nao confirma pagamento sozinho. Por isso a UI precisa deixar claro que a baixa manual depende de confering extrato. A solucao e intencional: reduz friccao de venda agora e preserva automacao para clientes maduros depois.

## Validacao

- gerar payload Pix deterministico com CRC correto;
- gerar QR Code renderizavel;
- converter orcamento em obra sem exigir CPF quando `manual_pix` estiver ativo;
- marcar cobranca manual como recebida;
- manter Asaas funcionando para empresas configuradas como `asaas`.
