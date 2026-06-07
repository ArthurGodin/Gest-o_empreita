# Revisao de produto e UX - Gestao Empreita

Data: 2026-06-06  
Ambiente revisado: `https://gestao-empreita.vercel.app`  
Base usada: producao validada, screenshots em `dogfood-output/screenshots/ux-review-*`, codigo em `web/src`, Vercel Web Interface Guidelines.

## Veredito

O produto ja esta vendavel para uma primeira demonstracao real: cadastro, orcamento, aprovacao publica, obra, Pix Asaas e webhook fecharam em producao. Isso e forte.

Mas ainda nao esta no nivel "que foda" porque a experiencia ainda parece um MVP operacional limpo, nao um produto guiado para fazer o empreiteiro ganhar a primeira venda sem pensar. O principal problema nao e beleza visual. E conducao, confianca e recuperacao de erro.

Notas atuais:

- Fluxo principal funcionando: 8.5/10
- Clareza comercial para vender: 7/10
- UX operacional desktop: 7.5/10
- UX operacional mobile: 6.8/10
- Confianca do cliente no link publico/pagamento: 7/10
- Produto "uau, pagaria por isso": 6.8/10

## Forcas

- Fluxo de dinheiro validado ponta a ponta em producao: quote -> aprovacao -> obra -> Pix -> webhook -> pago.
- Landing tem posicionamento claro: orcamento, obra e margem.
- Performance publica excelente no teste automatizado: TTFB 110ms, LCP 204ms, CLS 0.
- Mobile funciona sem quebrar layout, inclusive dashboard e criacao de orcamento.
- Link publico sem login e um diferencial bom para cliente final.
- O dashboard ja tem "Proximas acoes", que e uma boa base para virar um assistente de primeira venda.

## Achados Prioritarios

### P0 - Erro de integracao vira mensagem generica demais

O problema da `ASAAS_API_KEY` invalida foi real e apareceu para o usuario como "Nao foi possivel concluir a operacao. Tente novamente.". Isso e seguro tecnicamente, mas ruim para operacao, porque nao diz o proximo passo.

Referencias:

- `web/src/lib/log.ts:32-47`
- `web/src/app/app/obras/[id]/generate-charge-button.tsx:22-31`
- `web/src/app/app/obras/[id]/generate-charge-button.tsx:50`

Como deixar impecavel:

- Criar um "Health Check de Integracoes" em Configuracoes: Supabase, Asaas API, Pix key, Webhook, Resend.
- Em erros operacionais conhecidos, mostrar mensagem util sem vazar segredo: "Asaas recusou a chave configurada. Atualize a API Key em Configuracoes > Integracoes."
- No dashboard, alertar se Pix esta configurado incorretamente antes do usuario tentar cobrar.

Impacto: reduz suporte, evita travar venda e aumenta confianca do dono.

### P0 - Falta um fluxo guiado de primeira venda

O dashboard mostra metricas e proximas acoes, mas ainda nao conduz como um produto que pega pela mao. Para primeira venda, o usuario precisa de um trilho claro:

1. Cadastre cliente.
2. Monte orcamento.
3. Copie link para WhatsApp.
4. Cliente aprova.
5. Vire obra.
6. Gere Pix da entrada.

Referencias:

- `web/src/app/app/page.tsx:76-82`
- `web/src/app/app/page.tsx:136-145`
- `web/src/app/app/page.tsx:347-403`

Como deixar impecavel:

- Transformar "Proximas acoes" em "Seu primeiro dinheiro no app", com checklist visual.
- Mostrar progresso: `2/6 passos concluidos`.
- Cada passo precisa ter CTA especifico e linguagem de resultado: "Gerar link para mandar no WhatsApp", "Cobrar entrada por Pix".
- Quando zerado, priorizar uma unica acao primaria. Menos dashboard, mais caminho.

Impacto: melhora ativacao e aumenta chance de o usuario chegar no primeiro pagamento.

### P1 - Pagina de precos tem roadmap desatualizado

O codigo da pagina de precos lista como proximas melhorias coisas que ja existem em producao: cobranca Pix Asaas integrada e financeiro com recebidos/pendentes/atrasados.

Referencia:

- `web/src/app/precos/page.tsx:24-28`

Como deixar impecavel:

- Mover Pix e financeiro para "Incluso hoje".
- Roadmap real: PWA/offline, assinatura recorrente, relatorios, equipe/permissoes, templates avancados.
- Adicionar comparacao simples: "Hoje voce perde X horas fazendo isso em planilha/WhatsApp".

Impacto: evita vender o produto abaixo do que ele ja entrega.

### P1 - Mobile nav e cards truncam informacao importante

No mobile, labels como `Orcam.` e `Finan.` reduzem clareza. A proxima acao tambem truncou "Atualizar obra em andame...".

Referencias:

- `web/src/components/app-shell/mobile-nav.tsx:8-13`
- `web/src/app/app/page.tsx:142-153`

Como deixar impecavel:

- Trocar labels por termos curtos naturais: `Inicio`, `Orc.`, `Obras`, `Clientes`, `R$` ou `Caixa`.
- Dar mais altura para a proxima acao no mobile, permitindo 2 linhas no titulo.
- Priorizar CTA unico no topo do dashboard mobile.

Impacto: reduz esforco cognitivo no celular, que e canal central do publico.

### P1 - Link publico usa abas sem URL e sem semantica de tabs

A visao publica de obra/cobranca/orcamento usa estado local. O cliente nao consegue compartilhar diretamente a aba de cobranca, e suporte nao consegue mandar um link apontando direto para "Cobranca".

Referencias:

- `web/src/app/q/[token]/public-toggle.tsx:27-29`
- `web/src/app/q/[token]/public-toggle.tsx:37-73`

Como deixar impecavel:

- Sincronizar aba em query param: `?aba=cobranca`.
- Usar `role="tablist"`, `role="tab"`, `aria-selected`.
- Em caso de cobranca pendente, abrir a aba `cobranca` por padrao ou mostrar aviso forte no topo.

Impacto: melhora conversao de pagamento e reduz ida e volta no WhatsApp.

### P1 - Editor de orcamento pode perder rascunho ao navegar

O editor guarda mudancas em estado local e salva apenas quando o usuario clica. Como e uma tela longa e importante, perder item/valor por navegacao acidental e caro.

Referencias:

- `web/src/app/app/orcamentos/[id]/quote-editor.tsx:39-46`
- `web/src/app/app/orcamentos/[id]/quote-editor.tsx:93-123`
- `web/src/app/app/orcamentos/[id]/quote-editor.tsx:282-294`

Como deixar impecavel:

- Detectar `dirty state`.
- Avisar antes de sair com alteracoes nao salvas.
- Auto-salvar rascunho local ou remoto com debounce.
- Mostrar "Salvo ha X segundos" depois de salvar.

Impacto: protege o trabalho mais valioso do usuario.

### P1 - Link de orcamento usa `prompt`, `confirm` nativo e emoji estrutural

O card de compartilhamento usa `window.prompt`, `confirm` nativo e emoji de cadeado. Funciona, mas parece menos produto profissional.

Referencias:

- `web/src/app/app/orcamentos/[id]/share-link-card.tsx:52`
- `web/src/app/app/orcamentos/[id]/share-link-card.tsx:57`
- `web/src/app/app/orcamentos/[id]/share-link-card.tsx:117-135`

Como deixar impecavel:

- Substituir `confirm` por dialog do design system.
- Substituir emoji por icon Lucide.
- Adicionar toast com `aria-live` para "Link copiado".
- Depois de copiar, oferecer "Abrir WhatsApp".

Impacto: aumenta polimento e reduz risco em uma acao critica de venda.

### P2 - Login precisa recuperar senha

O login mobile esta limpo, mas nao tem "Esqueci minha senha". Para produto pago, isso vira suporte manual imediatamente.

Referencia:

- `web/src/app/(auth)/login/page.tsx:66-73`

Como deixar impecavel:

- Adicionar fluxo de reset de senha via Supabase.
- Copy: "Esqueci minha senha".
- Mostrar feedback claro de email enviado.

Impacto: reduz bloqueio operacional e suporte.

### P2 - Cobranca publica precisa transmitir mais confianca antes do pagamento

A aba publica de cobranca funciona. Antes do pagamento, ela mostra Pix copia-e-cola e "Pagar agora". Mas poderia converter melhor se parecesse mais comprovavel e seguro.

Referencias:

- `web/src/app/q/[token]/public-billing-view.tsx:162-222`

Como deixar impecavel:

- Mostrar nome da empresa, cliente, obra, vencimento e "Pagamento processado pelo Asaas".
- Adicionar "Depois do pagamento, esta tela atualiza automaticamente".
- Adicionar botao "Copiar Pix" separado do bloco de texto.
- Mostrar contato da empresa/WhatsApp se configurado.

Impacto: aumenta conversao de pagamento e reduz medo do cliente final.

### P2 - Promessa de PWA/offline ainda nao tem infraestrutura

A pagina de precos cita `PWA/offline para uso em campo`, mas nao ha manifest/service worker/offline hoje.

Referencia:

- `web/src/app/precos/page.tsx:27`

Como deixar impecavel:

- Enquanto nao implementar, manter como "em estudo" ou remover.
- Depois da primeira venda, implementar PWA com cache de leitura para obras, fotos pendentes e diario offline.

Impacto: alinha promessa com entrega real.

## UX Visual

O visual atual e coerente: branco, laranja de construcao, cards discretos, tipografia clara. Para SaaS operacional, isso esta no caminho certo. O que falta para parecer premium:

- Menos cards vazios em telas com poucos dados; mais narrativa de proxima acao.
- Mais estados de sucesso, progresso e "dinheiro em jogo".
- Melhor separacao entre "dado" e "acao".
- Tabelas/listas com densidade um pouco maior no desktop.
- Public link com acabamento mais confiavel, quase como uma pagina de proposta/pagamento.

## Plano de Execucao Recomendado

### Pacote 1 - Antes de mostrar para mais clientes

Tempo estimado: 1 a 2 dias.

1. Corrigir copy da pagina de precos.
2. Adicionar reset de senha.
3. Melhorar erro de Asaas com mensagem acionavel.
4. Criar health check visual de integracoes.
5. Remover emoji/prompt/confirm do compartilhamento.
6. Melhorar mobile nav e truncamento da proxima acao.

### Pacote 2 - Para virar produto que vende melhor

Tempo estimado: 2 a 4 dias.

1. Criar checklist "Primeiro dinheiro no app".
2. Sincronizar abas publicas via URL.
3. Melhorar tela publica de cobranca com confianca, Pix copy separado e Asaas trust copy.
4. Adicionar autosave/guard no editor de orcamento.
5. Melhorar estados vazios com exemplos e CTAs mais diretos.

### Pacote 3 - Depois da primeira venda

Tempo estimado: 1 a 2 semanas.

1. PWA/offline para campo.
2. Onboarding com dados exemplo opcionais.
3. Permissoes/equipe.
4. Relatorio simples por obra.
5. Dominio/email profissional.
6. Assinatura recorrente real.

## Proximo Melhor Passo

Implementar o Pacote 1 primeiro. Ele corrige risco de venda e suporte sem mexer pesado na arquitetura. Depois disso, o Pacote 2 transforma o produto de "funciona" para "quero usar".
