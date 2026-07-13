# Auditoria de lançamento seguro - Prumo

Data: 13/07/2026

## Resumo executivo

O produto tem fluxo real, cobrança real e base suficiente para vender. As correções foram aplicadas no Supabase e publicadas na Vercel. O Prumo pode iniciar **vendas assistidas**, mas ainda não deve receber tráfego pago até concluir mensuração, identificação pública e a compra controlada final.

Estado da decisão:

- venda assistida: liberada com acompanhamento das primeiras empresas;
- tráfego pago: liberar depois dos itens anteriores, Meta Ads validado e identificação pública do fornecedor;
- reformulação completa de UI/UX: executar depois do gate comercial, sem misturar com a publicação crítica.

## Crítico

### Resolvido no código local

- Alteração indevida de `companies.plan` por cliente autenticado: bloqueada por trigger de banco.
- Checkout pendente sobrescrevendo a assinatura ativa: campos separados na nova migration.
- Cliques concorrentes criando links duplicados: reserva de checkout e reutilização de link ativo.
- Webhook antigo rebaixando plano superior: evento obsoleto agora é ignorado e limpo.
- Upgrade mantendo duas recorrências: assinatura substituída é cancelada.
- Upgrade vencido deixando uma nova recorrência aberta: assinatura pendente agora também é cancelada.
- Boleto aparecendo antes da escolha no gateway: o Prumo cria link recorrente com forma indefinida; Pix, cartão ou boleto são escolhidos no Asaas.
- Cancelamento dependente de contato manual: proprietário ganhou cancelamento dentro da tela de plano.

### Pendente fora do código

- Executar compra controlada e confirmar ausência de recorrência duplicada no painel Asaas.

## Alto

### Resolvido no código local

- Preços duplicados e sujeitos a divergência: página comercial usa a mesma definição dos bloqueios do produto.
- Promessas sem implementação: removidas prioridade de implantação, escala vaga, trial, garantia inventada e automações inexistentes.
- Prova social falsa: avatares, números e depoimentos não verificáveis foram removidos.
- Landing excessivamente alta: removida animação de `80rem`; produto e CTAs ficam contínuos no primeiro acesso.
- Mobile sem acesso claro a configurações e saída: menu contém Catálogo, Plano, Configurações e Sair.
- Seis itens na navegação inferior: reduzidos a cinco comandos principais.
- Zoom bloqueado e formulários ampliando de modo incoerente: removido bloqueio de zoom e aplicado tamanho móvel estável aos campos.
- Navegação sobre área segura do aparelho: adicionados espaçamentos de safe area.

### Pendente fora do código

- `NEXT_PUBLIC_META_PIXEL_ID` não está configurado na produção.
- `META_CONVERSIONS_ACCESS_TOKEN` não está configurado na produção.
- Não há identidade pública do fornecedor nem contato público de suporte/privacidade.
- QA autenticado descartável concluído e removido sem alterar a conta do Asafe.

## Médio

- Limites gratuitos de orçamento e obra ainda usam contagem seguida de inserção; sob concorrência extrema podem ultrapassar a cota. Deve virar operação atômica no banco antes de grande escala.
- Cancelamento encerra o plano imediatamente. Uma evolução comercial melhor é cancelamento no fim do período já pago, o que exige registrar vigência.
- Falta monitoramento externo dedicado de erros; atualmente existem logs e alertas operacionais por email.
- Falta rotina documentada de backup, restauração e resposta a incidente.
- Termos e Privacidade precisam de revisão jurídica antes de escala, além do preenchimento da identidade do fornecedor.

## Baixo e evolução

- Remover componentes visuais não utilizados depois da reformulação para reduzir manutenção.
- Uniformizar componentes antigos que ainda usam raios, sombras e espaçamentos maiores que o novo padrão.
- Criar importação em lote de clientes e obras somente após validar demanda; hoje o Ultimate importa catálogo CSV e exporta relatório contábil CSV.
- Avaliar XLSX nativo depois de observar uso real do CSV.

## Planos auditados

- Grátis: 3 orçamentos por mês, 1 obra simultânea, link público, PDF com marca e fluxo operacional básico.
- Pro: limites de orçamento e obra removidos, marca removida e uso sem limite dos fluxos já existentes de diário, Pix e financeiro.
- Ultimate: tudo do Pro, importação de catálogo CSV de até 500 linhas e exportação CSV contábil de receitas recebidas e custos.

Nenhum plano anuncia SINAPI, múltiplos usuários com permissões avançadas, XLSX nativo, suporte VIP ou importação em lote de clientes/obras.

## Validação concluída

- TypeScript: aprovado.
- Testes: 19 arquivos e 81 testes aprovados.
- Lint: aprovado sem aviso de código.
- Build Next.js 16.2.10: aprovado, 28 páginas estáticas geradas.
- Dependências: `npm audit` com zero vulnerabilidades moderadas ou superiores.
- QA visual: landing e preços em 390x844 e 1440x900, sem rolagem horizontal ou erro de página.
- Evidências locais: `dogfood-output/runtime-qa/landing-mobile-viewport.png` e `dogfood-output/runtime-qa/landing-desktop-compact.png`.
- Produção: deployment `dpl_2FYkxYS3iPBqH4XN55gZGHFrrgEX`, estado `READY`, publicado em `https://gestao-empreita.vercel.app`.
- Smoke autenticado: app, menu mobile, plano, diagnóstico e checkout Pro abriram sem gerar cobrança.
- Webhook sem token: rejeitado com HTTP 401.
- Logs depois do QA: nenhuma resposta HTTP 500 encontrada.

## Sequência de publicação

1. Realizar uma compra controlada com outro pagador.
2. Confirmar no Asaas que não existe recorrência duplicada.
3. Configurar e validar Meta Ads.
4. Preencher identidade e contato públicos.
5. Iniciar anúncios com orçamento pequeno e acompanhar logs e webhooks.

## Segunda fase: UI/UX

Depois da publicação segura, a reformulação deve começar por tokens visuais e shell do aplicativo, seguir para dashboard e listas, depois formulários e detalhes, e terminar em landing e páginas públicas. Cada lote deve ser comparado em mobile e desktop sem alterar contratos de login, banco, Asaas ou PDF.
