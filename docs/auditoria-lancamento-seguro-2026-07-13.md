# Auditoria de lançamento seguro - Prumo

Atualizada em 17/07/2026.

## Resumo executivo

O Prumo possui uma V1 funcional e tecnicamente consistente para cadastro,
orçamento, aprovação pública, PDF, obra, diário, custos, equipe, financeiro e
assinatura SaaS. O gate local de qualidade está aprovado e o produto pode ser
publicado para vendas acompanhadas sem incluir promessa de recurso inexistente.

A liberação de tráfego pago em escala ainda depende de evidências externas que
não podem ser confirmadas pelo repositório: identificação pública do fornecedor,
canal de suporte, revisão jurídica, mensuração da Meta e conferência financeira
final no painel Asaas.

Decisão atual:

- código candidato à V1: **aprovado localmente**;
- publicação: **liberada após CI, deploy e smoke verdes**;
- vendas assistidas: **liberadas com monitoramento**;
- tráfego pago em escala: **pendente do gate operacional externo**.

## Riscos críticos resolvidos

- Alteração indevida de `companies.plan` por cliente autenticado foi bloqueada
  no banco.
- Checkout pendente não substitui mais os dados da assinatura ativa.
- Cliques concorrentes reutilizam a reserva de checkout em vez de criar links
  duplicados.
- Webhook antigo ou fora de ordem não rebaixa plano superior.
- Upgrade cancela a recorrência substituída e limpa assinatura pendente vencida.
- O Prumo não solicita boleto antes da escolha do cliente no gateway; Pix,
  cartão ou boleto são escolhidos no Asaas.
- Proprietário pode cancelar a assinatura pela tela de plano.
- Cotas do Grátis usam proteção atômica por empresa no banco.
- Segredos do Supabase, Asaas e webhook permanecem no servidor.

## Produto e UX resolvidos

- Landing e preços usam a mesma definição de planos dos bloqueios internos.
- Prova social, garantias, prioridades e automações não verificáveis foram
  removidas.
- Navegação mobile oferece acesso a plano, configurações e logout.
- Navegação inferior possui cinco destinos e respeita safe area.
- Zoom do navegador permanece permitido e campos mobile evitam ampliação
  automática por fonte pequena.
- Shell, listas, detalhes de obra e editor de orçamento foram convergidos para a
  identidade visual da landing.
- Editor de orçamento possui salvamento explícito, erro inline, desfazer e
  proteção de saída.
- Cliente, empresa e forma de recebimento informam estado salvo, alterações
  pendentes, falha e horário da última confirmação.
- Modelos de obra usam itens com identidade estável, validação por campo e
  confirmação de descarte.
- Etapa, gasto e ponto não descartam mais digitação relevante silenciosamente.
- Diário mantém rascunho em `sessionStorage` e upload com retry.

## Operação resolvida no repositório

- CI executa lint, typecheck, Vitest, auditoria, build e E2E com Supabase
  isolado.
- Logs estruturados, error boundaries e alertas operacionais por email existem.
- Diagnóstico autenticado verifica integrações sem expor credenciais.
- Runbook de backup, restauração e incidente está documentado em
  `docs/operacao-backup-restauracao.md`.
- Scripts de backup exigem destino externo e criptografia; o projeto de
  produção não é destino de ensaio de restauração.

## Planos auditados

### Grátis

- 3 orçamentos por mês;
- 1 obra simultânea;
- link público para aprovação;
- PDF com marca Prumo;
- fluxo operacional básico.

### Pro

- orçamentos e obras sem os limites do Grátis;
- PDF e link sem marca d'água;
- diário, custos, equipe, cobrança Pix e financeiro existentes no produto.

### Ultimate

- tudo do Pro;
- importação de catálogo CSV de até 500 linhas;
- exportação CSV contábil de receitas recebidas e custos.

Nenhum plano anuncia SINAPI, XLSX nativo, importação em lote de clientes/obras,
múltiplos usuários com permissões avançadas ou suporte VIP. SINAPI permanece
uma evolução posterior, sem promessa pública antes de fonte, atualização e UX
serem validadas.

## Evidência local de 17/07/2026

- Lint: aprovado sem erros ou avisos.
- TypeScript: aprovado.
- Vitest: 32 arquivos e 129 testes aprovados.
- Auditoria: `npm audit --audit-level=moderate` com 0 vulnerabilidades.
- Build: Next.js 16.2.10 aprovado; 28 páginas estáticas geradas.
- Browser E2E: 9 jornadas aprovadas e 5 skips intencionais.
- Core flow: aprovado em desktop e mobile.
- QA operacional: modelos, etapa, gasto e ponto aprovados em 375/390 px.
- QA responsivo: referências de 375, 390, 768 e 1440 px sem overflow
  horizontal bloqueante.
- Checkout nos testes: simulação local; nenhum gateway externo foi acionado.
- Worktree: deve permanecer limpo no commit de release.

## Evidência remota de 17/07/2026

- GitHub Actions `29585213704`: gate web e E2E com Supabase isolado aprovados.
- Vercel `dpl_2kyRkcm2uUxVBNGzGnzBmgeCzCYr`: estado `Ready` no alias principal.
- Smoke público: aprovado em desktop e mobile.
- Smoke autenticado mobile: onboarding, cliente, configurações, modelos, plano
  e menu de conta aprovados; conta temporária removida.
- Webhook sem token: rejeitado com HTTP 401.
- Nenhuma action de checkout ou cobrança externa foi usada no smoke.

## Pendências externas obrigatórias

### Financeiro

- Registrar uma compra controlada com pagador diferente do recebedor.
- Confirmar no Asaas uma única assinatura e uma única recorrência.
- Conferir ativação, upgrade e cancelamento no painel.
- Confirmar webhook ativo e sem entregas penalizadas.

### Identidade e jurídico

- Informar nome legal ou empresarial verdadeiro do fornecedor.
- Publicar email funcional de suporte e privacidade.
- Revisar Termos, Privacidade, cancelamento e reembolso com orientação jurídica.

### Operação

- Guardar um backup recente fora do projeto de produção.
- Registrar um ensaio de restauração em ambiente separado nos últimos 30 dias.
- Testar o recebimento dos alertas no endereço de `ALERT_EMAIL_TO`.
- Definir responsável e prazo de resposta para incidentes e pagamentos.

### Aquisição

- Configurar e testar Pixel e Conversions API da Meta quando Asafe iniciar as
  campanhas.
- Remover `META_TEST_EVENT_CODE` depois da validação.
- Começar com orçamento pequeno e acompanhar conversão, logs e webhook.

## Sequência segura

1. Concluir as evidências externas acima.
2. Conferir logs e entregas do webhook durante as primeiras vendas.
3. Só então ampliar tráfego pago e declarar lançamento comercial completo.

## Próxima evolução de produto

Depois do gate da V1, especificar o SINAPI Lite como recurso separado e
inicialmente voltado ao Ultimate: busca por código/descrição, UF e competência,
fonte visível, ajuste de margem e snapshot imutável no orçamento. Nenhuma base
deve ser copiada ou prometida sem processo de ingestão mensal e validação da
fonte oficial.
