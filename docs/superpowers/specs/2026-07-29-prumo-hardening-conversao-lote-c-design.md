# Prumo - Hardening de producao e conversao basica

## Contexto

A auditoria de 29/07/2026 confirmou que o Prumo ja possui um produto principal
funcional: autenticacao, isolamento por empresa, propostas, aceite publico, PDF,
projetos, financeiro, cobrancas, catalogo, SINAPI, briefings, ambientes,
entregas, planos e demonstracao.

O proximo lote nao cria um novo modulo e nao reformula todo o design. Ele fecha
os riscos de maior impacto encontrados na auditoria e inclui apenas as melhorias
comerciais que podem ser implantadas sem misturar uma grande mudanca visual com
pagamentos, dados e recuperacao.

## Objetivos

1. Tornar backup e restauracao verificaveis e coerentes com todos os arquivos do
   produto.
2. Restringir rotas publicas que hoje possuem autorizacao ambigua ou efeitos
   colaterais abusaveis.
3. Impedir que integracoes externas deixem requisicoes penduradas.
4. Garantir que uma exportacao contabil nunca seja entregue silenciosamente
   incompleta.
5. Deixar a suite de release verde e confiavel.
6. Melhorar contraste, LCP e SEO tecnico sem redesenhar a landing inteira.
7. Preparar mensuracao comercial de forma consentida, sem inventar credenciais
   ou transmitir PII indevida.
8. Transformar dados legais ausentes em um bloqueio explicito de lancamento, sem
   publicar informacoes pessoais automaticamente.

## Nao objetivos

Este lote nao inclui:

- reformulacao completa de landing, precos ou app autenticado;
- novos recursos para arquitetura, engenharia ou execucao;
- alteracao de precos, limites ou promessas dos planos;
- multiempresa por usuario ou novos papeis de equipe;
- importacao de clientes, obras ou projetos;
- troca do Asaas, Supabase, Vercel ou Resend;
- cobranca real, cancelamento real ou teste destrutivo em conta de cliente;
- ativacao da Meta sem credenciais validas e decisao de consentimento;
- publicacao automatica de CPF, CNPJ ou endereco;
- atualizacao principal de ESLint, Tailwind ou TypeScript;
- refatoracao ampla de arquivos grandes sem relacao direta com os achados.

## Abordagem aprovada

Foi escolhida a opcao C: fundacao de producao mais ganho comercial pequeno.

O lote sera dividido em tres trilhas independentes:

1. seguranca, recuperacao e integridade de dados;
2. confiabilidade de pagamento, telemetria e testes;
3. desempenho, acessibilidade e descoberta.

Cada trilha tera limites claros e testes proprios. Mudancas operacionais,
financeiras e visuais nao serao misturadas no mesmo commit quando isso
dificultar revisao ou rollback.

## Trilha 1: seguranca, recuperacao e integridade

### Verificador de backup

`web/scripts/verify-backup.ts` passara a expor uma funcao `main()` assincrona,
invocada com tratamento de erro no final do arquivo. O script continuara usando
o nucleo puro existente para checksum e inventario, mas nao dependera de
top-level await em um contexto CommonJS.

O comando devera:

- validar argumentos antes de tocar no pacote;
- conferir checksum;
- abrir e inspecionar o inventario quando a identidade `age` for fornecida;
- exigir `roles.sql`, `schema.sql`, `data.sql`, `manifest.json` e `storage`;
- informar erro sanitizado e codigo de saida diferente de zero;
- apagar temporarios mesmo quando a verificacao falhar;
- nunca imprimir chave, URL de banco ou conteudo de clientes.

### Cobertura de Storage

O backup ja enumera todos os buckets. A restauracao passara a usar o inventario
do pacote, em vez de uma lista fixa mantida manualmente.

O ensaio devera distinguir duas validacoes:

1. restauracao logica do banco em destino local ou remoto descartavel;
2. restauracao dos objetos de cada bucket encontrado no pacote.

O helper de restauracao de Storage:

- recusara o projeto de producao;
- exigira confirmacao explicita para destino remoto descartavel;
- criara ou validara os buckets antes do envio;
- percorrera todas as pastas abaixo de `storage`, incluindo
  `project-deliverables`;
- registrara apenas contagens, duracao e resultado;
- nao gravara caminhos assinados, nomes de clientes ou credenciais na
  evidencia.

Quando nao existir destino descartavel configurado, a verificacao local ainda
devera provar que o pacote contem o inventario completo. O relatorio deixara
claro que isso nao substitui o ensaio real de restauracao.

### Fotos do diario em link publico

A autorizacao da rota
`/q/[token]/photo/[id]` sera baseada em todas as condicoes abaixo:

- foto existente;
- proposta ligada ao mesmo projeto;
- proposta em estado publico permitido;
- token da proposta correspondente ao token da URL;
- arquivo existente no bucket esperado.

A consulta nao usara `maybeSingle()` em um conjunto que pode possuir varias
propostas. Tokens continuarao comparados em tempo constante. Erros de banco,
token invalido, foto ausente e arquivo ausente retornarao a mesma resposta 404,
sem revelar qual validacao falhou.

### Exportacao contabil

Receitas e custos serao consultados em paralelo. Qualquer erro em uma das
consultas impedira o download e retornara uma mensagem clara para tentar
novamente.

O gerador CSV recebera o segmento profissional e aplicara vocabulario de
apresentacao:

- `Projeto` para Arquitetura, Interiores e Engenharia;
- `Obra` para Execucao;
- categorias internas convertidas para os mesmos rotulos exibidos no app;
- `Sem projeto` ou `Sem obra`, conforme o segmento.

BOM UTF-8, separador por ponto e virgula, escape de aspas e valores em centavos
serao preservados. Nenhum dado parcial sera entregue como sucesso.

## Trilha 2: pagamento, telemetria e release

### Timeout do Asaas

Toda chamada do cliente Asaas tera prazo padrao. Um sinal fornecido pelo
chamador sera combinado com o timeout, sem ser ignorado.

Regras:

- timeout curto o bastante para responder antes do limite da funcao serverless;
- erro de timeout traduzido para mensagem segura e acionavel;
- chave, payload e documento nunca aparecem no log;
- requisicoes de escrita nao recebem retry automatico, evitando duplicidade;
- consultas idempotentes so terao retry se isso for adicionado de forma
  explicita e testada;
- o lock e o reaproveitamento de checkout existentes permanecem intactos.

### Eventos anonimos

O endpoint generico `/api/product-events` sera aposentado. Validar `Origin` ou
`Referer` nao transforma uma requisicao publica em uma fonte confiavel, pois
esses headers podem ser simulados fora do navegador.

`trackProductEvent` continuara enviando eventos comuns ao Vercel Analytics e,
quando permitido, ao Pixel no proprio navegador. Ele deixara de replicar cada
evento para uma rota publica do Prumo.

Erros reais de Server Actions, webhooks e rotas de servidor continuarao gerando
alertas pelos caminhos autenticados existentes. Error boundaries do navegador
serao registrados no analytics como diagnostico, sem poder gerar spam de email.
Clientes com JavaScript antigo podem receber 404 ao tentar a rota aposentada,
mas o envio atual ja e de melhor esforco e nunca interrompe o produto.

### Mensuracao Meta

A integracao permanecera desligada enquanto as variaveis de producao nao forem
fornecidas. A implementacao preparara uma fronteira explicita entre:

- analytics operacional essencial;
- medicao de marketing opcional;
- conversoes confiaveis originadas no servidor.

O Pixel nao sera carregado antes de uma escolha de consentimento para marketing.
Recusar marketing nao podera impedir login, cadastro, proposta, pagamento ou
qualquer outro recurso.

A preferencia sera guardada no cookie `prumo_marketing_consent`, com versao,
estado `granted` ou `denied`, `SameSite=Lax`, `Secure` em producao e validade de
180 dias. A Politica de Privacidade permitira rever a escolha.

Quando a Meta estiver configurada e ainda nao existir preferencia, sera exibida
uma barra compacta e nao modal. Ela tera texto direto, link para privacidade e
duas acoes com destaque equivalente: `Somente necessarios` e
`Aceitar medicao`. A barra nao cobreira a navegacao mobile nem usara aceite
pre-marcado.

Conversoes CAPI confiaveis deverao nascer em acoes de servidor, nao no endpoint
anonimo. Neste lote, os eventos elegiveis serao:

- cadastro criado com sucesso;
- onboarding concluido;
- checkout real gerado.

Cada acao gerara um `eventId`, usara o mesmo identificador no retorno para o
Pixel e enviara CAPI somente quando o cookie estiver em `granted`. Nenhum email,
telefone, CPF ou CNPJ sera enviado. O dado de correspondencia permitido sera o
cookie Meta presente na requisicao e um identificador interno convertido em
hash quando aplicavel.

`Purchase` nao sera enviado neste lote. O webhook Asaas nao possui o cookie de
consentimento do navegador; persistir consentimento para uso posterior exige
uma decisao de privacidade separada. A compra continuara sendo confirmada e
monitorada pelo proprio banco e webhook do Prumo.

Como as credenciais Meta sao externas ao repositorio, a conclusao sera dividida:

- codigo, consentimento, diagnostico e documentacao validados;
- ativacao de producao pendente ate o responsavel fornecer as credenciais.

### Identidade legal e suporte

Dados publicos do fornecedor serao centralizados em configuracao de servidor.
Termos, privacidade, rodape e diagnostico consumirao a mesma fonte.

Campos necessarios:

- nome legal ou empresarial;
- CPF ou CNPJ aplicavel;
- endereco de contato aplicavel;
- email de atendimento;
- versao/data dos documentos.

A configuracao usara os nomes:

- `PRUMO_LEGAL_NAME`;
- `PRUMO_LEGAL_DOCUMENT`;
- `PRUMO_LEGAL_ADDRESS`;
- `SUPPORT_EMAIL`;
- `PRUMO_LEGAL_DOCS_UPDATED_AT`.

Na ausencia de dados completos, o build continuara possivel para nao derrubar o
produto atual, mas o diagnostico de lancamento exibira um bloqueio critico e a
documentacao de producao permanecera pendente. O repositorio nao recebera
valores pessoais inventados nem copiara dados de conversas anteriores.

Os textos finais exigem revisao juridica humana. A implementacao garante
consistencia e visibilidade, nao oferece parecer juridico.

### Suite E2E

As tres expectativas antigas serao atualizadas para o comportamento atual:

- `Em aberto (simulado)` no financeiro do workspace demo;
- titulo de projeto arquitetonico com acento e prefixo atuais;
- seletores baseados em papel ou estado estavel, nao em copia acidental.

A captura full-page da pagina longa de configuracoes sera substituida por uma
captura de viewport ou helper resiliente. Falha de evidencia visual nao podera
invalidar um fluxo funcional depois que as assercoes passaram, mas a ausencia
da evidencia sera registrada claramente.

## Trilha 3: desempenho, acessibilidade e descoberta

### LCP da landing

A landing deixara de ser um unico Client Component. Conteudo estatico, inclusive
o hero, sera renderizado no servidor. Apenas interacoes que realmente precisam
de estado, como FAQ, permanecerao em um componente cliente pequeno.

O H1 e o texto principal nao terao estado inicial invisivel. Framer Motion sera
removido do caminho de renderizacao acima da dobra. Elementos decorativos
pesados e glows sem funcao serao removidos quando afetarem pintura ou
legibilidade.

Este lote preserva a estrutura e o conteudo comercial. Densidade, hierarquia e
reformulacao completa pertencem ao lote visual posterior.

### Contraste

O token primario claro sera ajustado para permitir texto branco com contraste
AA. Cores diretas equivalentes em landing e precos serao substituidas pelo token
ou por um tom aprovado.

A mudanca devera manter:

- identidade verde do Prumo;
- estados hover, focus, disabled e loading distinguiveis;
- foco visivel;
- contraste de texto comum de pelo menos 4,5:1;
- cor nao sendo o unico indicador de estado.

O tema escuro, mesmo nao sendo a experiencia principal, nao recebera uma
combinacao de foreground incompativel.

### SEO tecnico

Serao adicionados:

- `metadataBase` e canonical da aplicacao;
- `robots.ts`;
- `sitemap.ts` apenas com paginas publicas indexaveis;
- imagem Open Graph/Twitter baseada em ativo real do produto;
- titulo e descricao coerentes entre landing e precos.

Rotas autenticadas, onboarding, checkout, links publicos com token e APIs nao
entrarao no sitemap. Links com token deverao permanecer fora de indexacao.

### CSP em observacao

O primeiro passo sera uma Content-Security-Policy em modo `Report-Only`,
compativel com Next.js, Supabase, Vercel, Asaas, Resend e, quando consentida,
Meta.

Ela nao sera promovida para bloqueio neste lote. Primeiro serao coletadas e
revisadas violacoes reais, evitando quebrar login, scripts, imagens, PDFs ou
checkout por uma politica aplicada no escuro.

## Fluxos de dados

### Foto publica

1. A URL fornece token e id da foto.
2. O servidor carrega apenas caminho e projeto da foto.
3. O servidor encontra propostas publicas permitidas para o projeto.
4. O token e comparado sem revelar resultado intermediario.
5. Somente depois da autorizacao e criada uma URL assinada curta.

### Exportacao contabil

1. Usuario e empresa sao autenticados.
2. O servidor confirma o plano Ultimate.
3. Receitas e custos sao consultados em paralelo.
4. Qualquer falha encerra o fluxo sem arquivo.
5. Dados completos sao normalizados pelo segmento.
6. O cliente recebe o CSV com BOM UTF-8.

### Checkout

1. A regra de plano e o lock atual continuam decidindo se um checkout pode ser
   criado ou reaproveitado.
2. O cliente Asaas encerra a chamada ao atingir o timeout.
3. Escritas nao sao repetidas automaticamente.
4. O erro seguro volta para a tela; o detalhe tecnico fica no log sanitizado.
5. Webhook continua sendo a unica fonte de ativacao real do plano.

### Marketing

1. Analytics essencial funciona independentemente da Meta.
2. O usuario escolhe se aceita medicao de marketing.
3. O Pixel so carrega quando configurado e consentido.
4. Eventos anonimos nao sao replicados para uma API do Prumo.
5. Cadastro, onboarding e checkout originam conversoes confiaveis no servidor
   quando a medicao estiver configurada e permitida.
6. O mesmo `eventId` deduplica Pixel e CAPI.

## Tratamento de erros

- Backup invalido: falha explicita, temporarios removidos e nenhuma falsa
  confirmacao.
- Destino de restore inseguro: execucao recusada antes de qualquer escrita.
- Foto/token invalido: 404 uniforme.
- Consulta financeira parcial: nenhum CSV e mensagem de nova tentativa.
- Timeout Asaas: checkout preservado ou lock liberado conforme o estado atual,
  sem retry de escrita.
- Evento hostil: nao existe endpoint anonimo com efeitos colaterais para
  explorar.
- Meta ausente ou recusada: produto funciona normalmente.
- Identidade legal incompleta: diagnostico bloqueia lancamento, sem inventar
  valores.
- Falha de Lighthouse ou E2E: deploy nao e promovido ate a causa ser classificada
  e corrigida.

## Estrategia de testes

### Unitarios e integracao

- entrada, sucesso, checksum invalido e limpeza do verificador de backup;
- inventario com todos os buckets e `project-deliverables`;
- foto com uma proposta, varias propostas, token incorreto, proposta nao
  publica e falha de Storage;
- analytics cliente sem chamada ao endpoint aposentado e error boundary anonima
  sem alerta;
- timeout Asaas, cancelamento externo e escrita sem retry;
- erro apenas em receitas, apenas em custos e sucesso completo do CSV;
- vocabulario CSV para cada segmento e todas as categorias;
- metadata, robots e sitemap sem rotas privadas;
- carregamento do Pixel condicionado a configuracao e consentimento;
- deduplicacao de Pixel/CAPI para cadastro, onboarding e checkout;
- recusa e revisao do consentimento sem bloquear o produto.

### Gates

- `npm test`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- `npm audit --omit=dev`;
- `supabase db lint`;
- comparacao de migracoes local/remoto;
- suite Playwright completa.

### QA real

Viewports:

- 375 x 812;
- 390 x 844;
- 768 x 1024;
- 1440 x 900.

Cenarios:

- landing, precos, login, cadastro e consentimento;
- conta Gratis, Pro e Ultimate;
- exportacao contabil com acentos e categorias;
- portal com projeto que possui mais de uma proposta;
- foto publica autorizada e negada;
- checkout demo bloqueado;
- checkout de producao apenas ate antes de criar nova cobranca;
- termos, privacidade, robots, sitemap e compartilhamento social;
- console, foco, teclado, zoom e overflow horizontal.

Lighthouse sera repetido nas mesmas paginas da linha de base, tres vezes por
pagina, com o mesmo perfil de emulacao e sem extensoes. A mediana sera usada nas
metas:

- landing mobile: Performance >= 90;
- landing, precos e login: Acessibilidade >= 100 nos checks automatizados;
- LCP da landing mobile <= 2,5 s em execucao comparavel;
- Best Practices e SEO sem regressao.

## Rollout e rollback

1. Corrigir scripts de backup e validar sem destino de producao.
2. Corrigir rotas publicas e exportacao, com testes.
3. Adicionar timeout Asaas sem alterar regras de checkout.
4. Deixar E2E verde.
5. Aplicar contraste, LCP, SEO e CSP Report-Only.
6. Publicar preview e executar QA.
7. Publicar producao.
8. Verificar monitor operacional, logs, endpoints publicos e Lighthouse.

Cada trilha tera commit separado. Nenhuma migracao destrutiva sera usada. Se uma
regressao aparecer, o commit da trilha correspondente podera ser revertido sem
desfazer as demais.

Meta e identidade legal terao ativacao separada, pois dependem de dados externos
do responsavel. A ausencia desses dados nao sera mascarada como tarefa
concluida.

## Criterios de aceite

1. `npm run backup:verify` executa e rejeita pacote invalido.
2. O inventario e o procedimento de restore cobrem todos os buckets.
3. Fotos publicas funcionam com varias propostas e negam tokens/estados
   invalidos.
4. Nao existe endpoint anonimo capaz de disparar alertas ou CAPI.
5. Asaas possui timeout testado e nenhuma escrita recebe retry automatico.
6. CSV nunca e entregue apos erro parcial e usa vocabulario correto.
7. A suite E2E completa fica verde ou possui skip explicito, justificado e
   isolado para dependencia externa.
8. Landing mobile atinge as metas de LCP, contraste e Lighthouse definidas.
9. Robots, sitemap, canonical e imagem social existem e excluem rotas privadas.
10. Pixel e CAPI permanecem desativados sem configuracao e consentimento.
11. Diagnostico identifica credenciais Meta e identidade legal ausentes.
12. Nenhuma cobranca real e criada durante o QA automatizado.
13. Typecheck, lint, testes, build, DB lint e auditoria de producao passam.
14. Planos, webhooks, PDFs, login, cadastro e RLS nao sofrem regressao.
