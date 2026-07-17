# Prumo V1 - Relatório de release

Data da avaliação: 17/07/2026.

## Decisão

**Gate técnico local e remoto: APROVADO.**

O código foi aprovado pelo CI, publicado na Vercel e validado por smoke público
e autenticado. A declaração de lançamento comercial completo permanece
**PENDENTE EXTERNO** até as evidências financeiras, operacionais, jurídicas e de
identidade serem registradas.

## Escopo entregue

- navegação protegida compartilhada para formulários persistíveis;
- estados explícitos de salvo, alterado, salvando e falha;
- cliente com validação por campo e recuperação de erro de rede;
- dados da empresa e recebimento com proteção coordenada;
- modelos de obra com itens estáveis, ordem segura e descarte confirmado;
- etapa, gasto e ponto com rótulos acessíveis, erro inline e fechamento seguro;
- parser monetário aceitando formato brasileiro e ponto decimal mobile;
- E2E dedicado para persistência e descarte dos comandos operacionais;
- nomenclatura visível simplificada de `template` para `modelo`.

O lote não alterou migration, RLS, contrato do Asaas, webhook, planos, PDF,
aprovação pública ou regras de cobrança.

## Matriz do gate técnico

| Critério | Resultado | Evidência |
| --- | --- | --- |
| Lint | Aprovado | `npm run lint` |
| Typecheck | Aprovado | `npm run typecheck` |
| Testes unitários | Aprovado | 32 arquivos, 129 testes |
| Dependências | Aprovado | 0 vulnerabilidades moderadas ou superiores |
| Build | Aprovado | Next.js 16.2.10, 28 páginas estáticas |
| E2E desktop | Aprovado | 7 jornadas |
| E2E mobile | Aprovado | core flow e páginas públicas |
| QA 375/390 px | Aprovado | formulários operacionais sem overflow |
| QA 768/1440 px | Aprovado | shell, listas, detalhe e editor |
| CI remoto | Aprovado | run `29585213704` |
| Deploy Vercel | Aprovado | `dpl_2kyRkcm2uUxVBNGzGnzBmgeCzCYr` `Ready` |
| Smoke produção | Aprovado | público desktop/mobile e autenticado mobile |

Os 5 skips da suíte são intencionais: testes que percorrem manualmente todos os
viewports rodam uma vez no projeto desktop, enquanto o core flow e o smoke
público também rodam no projeto mobile.

## Evidência remota

- Commit candidato validado: `a842987441d7c8f4633d0f6fdf6286cc4dbc1ffe`.
- GitHub Actions: `https://github.com/ArthurGodin/Gest-o_empreita/actions/runs/29585213704`.
- `Web quality gate`: aprovado.
- `Supabase and browser E2E`: aprovado.
- Deployment Vercel: `dpl_2kyRkcm2uUxVBNGzGnzBmgeCzCYr`, estado `Ready`.
- Alias principal: `https://gestao-empreita.vercel.app`.
- Smoke público: landing, preços e páginas públicas aprovadas em desktop e
  mobile.
- Smoke autenticado: onboarding, novo cliente, configurações, modelos, plano e
  menu mobile aprovados; usuário e empresa temporários removidos.
- Webhook sem token: HTTP 401 com `{"ok":false}`.

## Invariantes conferidos

- Server actions continuam autenticando usuário e empresa.
- Dados de Pix, documentos, tokens e credenciais não entram em analytics nem em
  screenshots de QA.
- Erro de rede não atualiza a referência salva.
- Navegação protegida não intercepta download, link externo ou âncora local.
- Dupla submissão fica bloqueada durante operação pendente.
- Checkout E2E usa modo local e não cria cobrança externa.
- Planos prometem apenas recursos presentes no produto.

## Gate operacional externo

| Evidência | Estado |
| --- | --- |
| Identidade pública verdadeira do fornecedor | Pendente |
| Email público de suporte/privacidade | Pendente |
| Revisão jurídica dos documentos | Pendente |
| Compra com pagador diferente | Pendente de registro |
| Única assinatura/recorrência no Asaas | Pendente de conferência |
| Upgrade e cancelamento conferidos | Pendente de conferência |
| Webhook ativo e saudável no painel | Pendente de conferência |
| Alerta recebido em `ALERT_EMAIL_TO` | Pendente de evidência |
| Backup recente externo | Pendente de evidência |
| Restauração ensaiada fora da produção | Pendente de evidência |
| Meta Pixel e Conversions API | Responsabilidade da operação de anúncios |

## Regra de publicação

1. Commit de release com worktree limpo: concluído.
2. Push para `main`: concluído.
3. CI integral aprovado: concluído.
4. Vercel com deployment `Ready` no alias principal: concluído.
5. Smoke público e autenticado: concluído.
6. Tag `v1.0.0`: autorizada pelo gate técnico.
7. Tráfego pago em escala: aguardar o gate operacional externo.

## Próximo ciclo

Com a V1 publicada, o próximo desenvolvimento deve ser a especificação do
SINAPI Lite, sem misturá-lo ao gate atual. A primeira versão deve validar fonte,
UF, competência, busca, snapshot e atualização mensal antes de aparecer nos
planos ou na landing.
