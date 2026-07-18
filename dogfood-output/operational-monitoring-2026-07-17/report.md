# Rollout de Producao: Monitoramento Operacional Prumo

| Campo | Resultado |
|---|---|
| Data local | 2026-07-17 |
| URL publica | https://gestao-empreita.vercel.app |
| Deploy validado | `fd28988` |
| Deploy Vercel | `gestao-empreita-dee7z6nki-arthurgodins-projects.vercel.app` |
| Resultado | Aprovado |

## Escopo

- Monitor privado diario para coerencia entre Prumo, Supabase e Asaas.
- Persistencia de execucoes e incidentes com acesso exclusivo por `service_role`.
- Alertas de abertura e recuperacao com deduplicacao.
- Reconciliacao segura de cobrancas locais obsoletas e assinatura ativa.
- Hotfix para tratar `cancelled + remote not_found` como estado reconciliado.

## Publicacao

- Migration `20260717000004_operational_monitoring.sql` aplicada no Supabase de producao.
- Cron Vercel configurado para `15 11 * * *` (08:15 no horario de Brasilia).
- `CRON_SECRET` rotacionado e armazenado apenas como variavel sensivel na Vercel.
- Endpoint sem credencial respondeu `401` e `status: unauthorized`.
- Endpoint autenticado respondeu `200` e `status: healthy`.

## Estado Final

| Verificacao | Resultado |
|---|---:|
| Incidentes abertos | 0 |
| Incidentes resolvidos | 8 |
| Incidentes na ultima execucao | 0 |
| Alertas processados na ultima execucao | 1 |
| Cobrancas Asaas obsoletas canceladas e nao pagas | 7 |
| Cobrancas canceladas com `paid_at` preenchido | 0 |
| Plano da empresa de demonstracao | Ultimate |

Nenhuma cobranca foi marcada como paga durante a reconciliacao. A mudanca de plano ocorreu somente para a assinatura remota confirmada como ativa.

## Alertas

- O provedor Resend aceitou o alerta de recuperacao para um destinatario.
- Os logs registraram `ops.alert.sent` e `ops.monitor.completed` com estado saudavel.
- A aceitacao pelo provedor foi confirmada; entrega ou leitura na caixa de entrada nao foi presumida.

## Qualidade

- Testes focados do monitor: 36 aprovados.
- Suite unitaria completa: 43 arquivos e 226 testes aprovados.
- Typecheck: aprovado.
- Lint: aprovado.
- Build de producao: aprovado, incluindo `/api/cron/operational-health`.
- Auditoria de dependencias: 0 vulnerabilidades conhecidas.
- Lint do banco: sem achados.
- E2E de banco: 2 de 2 aprovados.
- E2E desktop: 7 de 7 aprovados.
- E2E mobile dedicado: 2 de 2 aprovados; 5 cenarios de viewport de referencia foram ignorados intencionalmente no projeto mobile.

## Pendencias Operacionais

1. Verificar o dominio `gestaoempreita.com.br` no Resend e restaurar o remetente comercial do Prumo. Ate isso ocorrer, producao usa temporariamente `Prumo <onboarding@resend.dev>`.
2. Revisar a integracao Git da Vercel: o push do hotfix nao iniciou um deploy automatico e a publicacao precisou ser feita pela CLI.
3. Confirmar manualmente o recebimento do alerta na caixa de entrada do responsavel.

## Privacidade

Este relatorio nao contem IDs internos, CPF/CNPJ, emails de clientes, tokens, chaves ou payloads do Asaas. `docs/CHECKLIST_LANCAMENTO.md` permaneceu fora dos commits deste rollout.
