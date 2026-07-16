# Prumo UX/UI - Convergencia operacional e acabamento de produto

## Contexto

O Prumo ja possui uma base funcional de produto, identidade publica consolidada e uma primeira rodada de refinamento operacional implementada nos commits `327da5d`, `c9d5c45` e `7549be7`. A fundacao atual inclui tokens semanticos, shell responsivo, navegacao mobile, componentes compartilhados e melhorias nas telas mais usadas.

Esta especificacao define a segunda etapa de UX/UI. Ela nao substitui o documento `2026-07-13-prumo-ux-ui-operacional-premium-design.md`; ela fecha as inconsistencias restantes, melhora os fluxos complexos e leva o mesmo nivel de acabamento a configuracoes, planos, checkout, autenticacao e superficies publicas.

## Objetivo

Fazer o Prumo parecer e funcionar como um unico produto profissional em celular e desktop, com foco em:

1. reduzir esforco para concluir tarefas frequentes;
2. deixar a proxima acao evidente sem treinamento;
3. aumentar densidade util sem comprometer toque ou leitura;
4. alinhar o app interno a identidade da landing page;
5. preservar integralmente regras de negocio, pagamentos, seguranca e PDFs;
6. manter planos Gratis, Pro e Ultimate visual e comercialmente fieis ao que o sistema entrega.

## Nao objetivos

Esta etapa nao inclui:

- rebranding ou troca do nome Prumo;
- criacao de novos modulos ou promessas comerciais;
- alteracao de precos, limites ou direitos dos planos;
- mudanca de schema, RLS, autenticacao ou contratos do Supabase;
- mudanca do fluxo funcional, webhook ou API do Asaas;
- reimplementacao da geracao de PDF;
- expansao do modo escuro;
- reconstruir telas que ja atendem aos criterios apenas para gerar diferenca visual;
- criacao de mockups externos ao produto real.

## Publico e contexto de uso

O usuario principal e um pequeno empreiteiro ou gestor que alterna entre escritorio, obra e WhatsApp. Ele pode operar com uma mao, sob luz forte, conexao instavel e pouco tempo. A interface deve favorecer reconhecimento, leitura rapida e recuperacao de erros.

O produto deve ser autoexplicativo sem depender de textos longos. Nomes de acoes, hierarquia, estado atual e feedback devem ensinar o uso durante a operacao.

## Direcao aprovada

### Evolucao coesa

A direcao escolhida preserva a personalidade da landing page e consolida no app uma linguagem de `operacional premium`: seria, compacta, clara e confiavel. O valor visual vem da precisao, nao de decoracao.

Alternativas descartadas:

- utilitario apenas no app: teria menor risco, mas manteria a ruptura entre produto e marca;
- reformulacao visual total: permitiria maior ruptura estetica, mas aumentaria risco funcional e custo sem retorno proporcional antes da venda.

## Principios de produto

1. Informacao primeiro, decoracao depois.
2. Uma acao primaria por contexto.
3. Densidade media: sem cards gigantes e sem compactacao que prejudique o toque.
4. Componentes iguais devem se comportar e parecer iguais em todo o produto.
5. Mobile e uma composicao propria, nao apenas desktop espremido.
6. Estados vazios, erros e carregamentos fazem parte do fluxo principal.
7. Cor nunca sera o unico meio de comunicar estado.
8. Nenhuma mudanca visual pode mascarar ou alterar uma regra funcional.

## Sistema visual

### Tipografia

- Manter Manrope como familia principal.
- Titulos de pagina: 22 a 24 px no mobile e 24 a 28 px no desktop.
- Titulos internos: 16 a 18 px.
- Corpo: 14 a 16 px conforme importancia e contexto de toque.
- Texto auxiliar: minimo de 12 px e contraste AA quando essencial.
- Numeros financeiros e contagens usam `tabular-nums`.
- Letter spacing permanece em `0`, salvo texto de marca ja existente.
- Titulos e descricoes nao escalam com largura de viewport.

### Cores

- Verde Prumo: acao primaria, selecao, sucesso e foco.
- Grafite: estrutura, navegacao e texto principal.
- Cinza muito claro: canvas do app.
- Branco: superficie de controles e paineis que precisam de enquadramento.
- Laranja: assinatura, plano e contexto comercial, com uso pontual.
- Ambar e vermelho: aviso e erro, sempre acompanhados de icone ou texto.
- As telas internas devem consumir tokens semanticos; cores diretas ficam restritas a tokens e ativos da marca.
- A landing pode ser mais expressiva, mas app, checkout e paginas publicas compartilham a mesma base cromatica.

### Espacamento e forma

- Escala principal: 4, 8, 12, 16, 24 e 32 px.
- Margem lateral: 16 px no mobile, 24 px no tablet e 24 a 32 px no desktop.
- Distancia entre secoes: 16 a 24 px.
- Raio padrao: 6 px em controles e 8 px em superficies.
- Pills ficam reservadas a filtros, status, contagens e controles segmentados.
- Sombras discretas; elevacao media apenas em menus, dialogs e elementos flutuantes.
- Cards enquadram itens repetidos ou ferramentas. Secoes de pagina permanecem abertas.
- Cards dentro de cards nao serao usados para criar hierarquia.

### Iconografia e movimento

- Usar Lucide para acoes e navegacao quando houver icone equivalente.
- Icones mantem tamanhos previsiveis por contexto.
- Controles somente com icone possuem tooltip no desktop e nome acessivel.
- Alvos de toque possuem no minimo 44 x 44 px, ainda que o icone seja menor.
- Movimento deve ser curto, funcional e sem alterar layout.
- `prefers-reduced-motion` deve ser respeitado.

## Componentes compartilhados

### Controles

`Button`, `Input`, `Textarea`, `Select`, checkbox, toggle e controle segmentado devem compartilhar altura, foco, erro, disabled e loading. Inputs mobile mantem fonte de pelo menos 16 px para impedir zoom automatico.

O loading de um botao preserva sua largura. A acao destrutiva nunca usa a mesma aparencia da acao primaria. Acao irreversivel exige confirmacao com contexto suficiente.

### Feedback

Alertas usam as mesmas variantes em todo o produto: info, sucesso, aviso e erro. Mensagens devem dizer o que ocorreu e a proxima acao possivel. Toast nao substitui erro proximo ao campo ou secao responsavel.

Skeletons preservam as dimensoes finais. Estados vazios possuem titulo curto, contexto necessario e uma unica proxima acao. Nenhum estado vazio ocupa a maior parte da viewport sem necessidade.

### Cabecalho de pagina

Toda tela interna segue uma estrutura previsivel:

1. breadcrumb opcional em fluxos profundos;
2. titulo e descricao curta;
3. acao primaria;
4. acoes secundarias subordinadas;
5. conteudo.

No mobile, titulo e acao podem quebrar em linhas diferentes. A acao ocupa largura total apenas quando isso melhora o fluxo.

### Busca, filtros e listas

Busca, filtros, contagem e ordenacao formam uma toolbar responsiva. Filtros usam controles compactos e nao criam varias linhas de chips quando um menu ou controle segmentado comunica melhor.

No desktop, listas de alta densidade usam linhas ou tabelas compactas. No mobile, cada linha se adapta para resumo, estado, contexto e valor sem esconder informacao essencial. A altura da linha nao muda ao carregar badges, icones ou acoes.

### Formularios

- Largura controlada e agrupamento por assunto.
- Labels sempre visiveis.
- Ajuda somente onde evita erro real.
- Validacao proxima ao campo e resumo quando o erro estiver fora da viewport.
- Acoes sticky apenas em formularios longos ou editores, respeitando topbar, bottom navigation e safe area.
- Alteracoes nao salvas devem ser claras onde ja houver suporte funcional.

## Shell e navegacao

### Desktop

- Sidebar fixa e compacta, com marca, empresa e seis modulos principais.
- Plano, configuracoes e sair ficam agrupados na parte inferior.
- Conteudo usa um unico container compartilhado, substituindo divergencias entre `max-w-[1184px]` e variantes de `container`.
- O shell nao enquadra a pagina inteira em um card.

### Mobile

- Topbar de 56 px respeitando safe area.
- Bottom navigation com Inicio, Orcamentos, Obras, Clientes e Financeiro.
- Catalogo, Plano, Configuracoes e Sair permanecem no menu superior.
- Conteudo reserva espaco para barras fixas e gesture area.
- O item ativo nao muda a geometria da navegacao.
- Nenhuma tela deve abrir com zoom, overflow horizontal ou conteudo oculto sob barras fixas.

### Responsividade

Os layouts de referencia sao:

- 375 x 812;
- 390 x 844;
- 768 x 1024;
- 1440 x 900.

Tambem serao verificados textos longos, valores monetarios altos, teclado virtual, orientacao paisagem e listas vazias/preenchidas.

## Arquitetura das telas

### Inicio

- Priorizar pendencias e indicadores que mudam decisao.
- Metricas ficam em uma faixa compacta.
- Onboarding perde destaque conforme o usuario conclui etapas.
- Obras e orcamentos recentes usam o mesmo idioma visual das listas completas.

### Orcamentos

- Busca e status ocupam uma unica faixa responsiva.
- Numero, titulo, cliente, validade, status e valor mantem hierarquia fixa.
- `Novo orcamento` e a acao primaria.
- No editor, itens e total dominam a tela; configuracoes auxiliares ficam subordinadas.
- Desktop usa area principal e resumo sticky somente quando houver espaco real.
- Mobile usa fluxo vertical e barra de acao que nao cobre campos ou navegacao.
- Envio, aprovacao, conversao em obra e PDF preservam comportamento atual.

### Obras

- Lista destaca status, prazo, cliente e valor.
- Detalhe comeca por resumo, estado e proxima acao.
- Etapas, diario, custos, horas e cobranca recebem navegacao local curta quando isso reduzir rolagem e procura.
- Secoes abertas e divisores substituem empilhamento de cards equivalentes.
- Acoes operacionais e financeiras permanecem visualmente distintas.

### Clientes e catalogo

- Compartilham toolbar, lista, contagem e estado vazio.
- Acao principal cria a entidade; editar, excluir e WhatsApp ficam subordinados.
- Formularios usam os mesmos grupos, feedback e barra de acoes do restante do app.
- Importacao aparece somente onde o recurso realmente existe e para o plano autorizado.

### Financeiro

- Resumo usa numeros tabulares e ordem de importancia consistente.
- Recebido, pendente, atrasado, custo e margem nao dependem apenas de cor.
- Cobrancas, gastos e margem por obra possuem hierarquia distinta.
- Exportacao fica visivel apenas no plano e formato realmente suportados.
- Caixa e cobranca nao podem abrir com zoom ou exigir rolagem horizontal.

### Configuracoes

- Agrupar dados da empresa, identidade, recebimento, templates e diagnostico por objetivo.
- Evitar uma grade de cards de navegacao grandes.
- Explicar consequencias antes de acoes sensiveis.
- Diagnostico deve informar estado e reparo possivel sem expor segredos internos.

### Planos e checkout

- Usar o mesmo sistema visual do app, reduzindo `rounded-xl`, `rounded-2xl`, alturas fixas e excesso de laranja.
- Comparacao dos tres planos permanece honesta e legivel no mobile.
- Recursos `Em breve` nao contam como entrega atual nem recebem o mesmo peso de recursos ativos.
- Checkout preserva criacao da assinatura, redirecionamento ao Asaas e liberacao por webhook.
- O Prumo nao gera uma cobranca local adicional nem comunica boleto como preselecionado.
- Erros de integracao informam tentativa segura, proxima acao e identificador util quando disponivel.

### Autenticacao e onboarding

- Login e cadastro devem comunicar marca, seguranca e acao principal sem composicao promocional exagerada.
- Erros de credencial, confirmacao e sessao expirada possuem mensagens distintas.
- Onboarding coleta apenas o necessario para iniciar o uso.
- A primeira tela preenchida indica uma tarefa real, nao uma visita guiada longa.

### Paginas publicas e PDF

- Orcamento publico prioriza empresa, escopo, valor, validade e aceite.
- Aprovacao e pagamento deixam estado e consequencia claros.
- A interface publica usa os mesmos tokens, mas nao replica a navegacao interna.
- O PDF preserva estrutura e contrato atual; ajustes visuais ficam limitados a consistencia de marca e legibilidade, sem alterar dados.

### Landing page

- A landing continua sendo a referencia expressiva da marca.
- A intervencao sera de refinamento: densidade, coerencia de componentes, links de preco e responsividade.
- Nao sera feita uma nova hero ou uma reconstrucao comercial sem evidencia de problema.

## Dados, regras e estados

Esta reforma atua na camada de apresentacao. Componentes continuam consumindo os mesmos dados, server actions e rotas existentes. Mudancas de markup nao podem alterar:

- payloads enviados ao Supabase ou Asaas;
- condicoes de permissao e bloqueio por plano;
- calculos, arredondamento e moeda;
- URLs publicas e tokens;
- estados de assinatura e cobranca;
- conteudo obrigatorio do PDF.

Cada tela deve representar explicitamente: carregando, vazio, sucesso, erro recuperavel, erro sem permissao e dado parcial quando aplicavel. Estados nao suportados pelo backend nao serao simulados.

## Planos e honestidade comercial

Antes de qualquer ajuste visual em precos, sera comparado o texto apresentado com os bloqueios e implementacoes reais. A regra e:

- recurso ativo e validado pode ser prometido;
- recurso parcial deve ser descrito com seu limite real;
- recurso futuro recebe `Em breve` ou e removido da comparacao principal;
- diferencas de plano devem aparecer no momento da decisao, sem bloquear tarefas silenciosamente;
- nenhum bloqueio pode ser removido ou relaxado apenas para melhorar a demonstracao visual.

## Acessibilidade

- Contraste minimo AA para texto e controles.
- Foco visivel em todos os elementos interativos.
- Ordem de tabulacao acompanha a ordem visual.
- Dialogs prendem foco e restauram foco ao fechar.
- Controles por icone recebem nome acessivel.
- Icones decorativos recebem `aria-hidden`.
- Feedback assincrono importante usa anuncio acessivel.
- Zoom do navegador nunca sera bloqueado.
- Layout suporta ampliacao de texto sem sobreposicao incoerente.

## Ordem de implementacao

### Lote 1 - Convergencia da fundacao e navegacao

- auditar os tokens e componentes ja implementados;
- criar o container compartilhado de pagina;
- normalizar cabecalho, alertas, loading e estados vazios;
- fechar inconsistencias entre sidebar, topbar e bottom navigation;
- corrigir zoom, overflow e safe areas globais.

Este lote e incremental. Ele nao reescreve a fundacao aprovada em 13 de julho.

### Lote 2 - Operacao diaria

- Inicio;
- listas de Orcamentos, Obras, Clientes e Catalogo;
- Financeiro;
- busca, filtros, metricas e densidade responsiva.

Telas que ja atendem ao padrao recebem apenas correcao comprovavel.

### Lote 3 - Fluxos complexos

- editor e visualizacao de orcamento;
- detalhe da obra;
- etapas, diario, custos, horas e cobranca;
- formularios de cliente, empresa e templates.

### Lote 4 - Configuracoes e monetizacao

- configuracoes e diagnostico;
- planos e comparacao;
- checkout e estados de erro;
- consistencia das regras e promessas comerciais.

### Lote 5 - Autenticacao e superficies publicas

- login, cadastro e onboarding;
- orcamento publico, aprovacao e acompanhamento;
- consistencia visual do PDF;
- refinamento pontual da landing e precos.

Cada lote termina em commit proprio e pode ser revertido sem depender do lote seguinte.

## Validacao por lote

1. Revisar diff para confirmar ausencia de alteracao funcional acidental.
2. Rodar lint, typecheck, testes unitarios e build.
3. Rodar E2E dos fluxos afetados em desktop e mobile.
4. Fazer QA visual no produto real, sem mockups, nas quatro larguras de referencia.
5. Conferir console, overflow, safe areas, foco, teclado, loading, erro e estado vazio.
6. Revalidar login, cadastro, PDF, bloqueios de plano e pagamento quando o lote tocar nessas superficies.
7. Registrar screenshots apenas como evidencia de QA, sem adiciona-las ao produto.

## Estrategia de risco e reversao

- Separar refatoracao visual de qualquer correcao funcional descoberta.
- Preservar assinaturas publicas de componentes quando houver muitos consumidores.
- Alterar um padrao compartilhado primeiro e migrar consumidores em grupos pequenos.
- Evitar migracao global mecanica de classes sem inspecao por tela.
- Usar commits por lote para permitir reversao objetiva.
- Interromper o lote se pagamentos, autenticacao, permissoes, PDFs ou navegacao publica regressarem.

## Criterios de aceite

A etapa sera concluida quando:

1. app, checkout, autenticacao e paginas publicas parecerem partes da mesma marca;
2. nenhuma tela de referencia abrir com zoom ou overflow horizontal;
3. navegacao, titulo, acao primaria, feedback e estados vazios forem previsiveis;
4. listas e formularios tiverem densidade media e alvos de toque adequados;
5. editor de orcamento e detalhe da obra forem confortaveis no mobile e eficientes no desktop;
6. planos mostrarem apenas recursos e limites reais;
7. login, pagamento, webhook, bloqueios, links publicos e PDFs continuarem funcionais;
8. lint, typecheck, testes, build e E2E relevantes estiverem verdes;
9. QA visual nao encontrar sobreposicao, conteudo cortado, espacos desproporcionais ou inconsistencias relevantes.
