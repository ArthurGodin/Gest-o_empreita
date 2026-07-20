# Prumo - Resiliencia, convergencia UX e ativacao guiada

## Contexto

O Prumo ja possui os fluxos centrais de uma V1 comercial, uma linguagem visual
operacional consolidada em varios lotes, onboarding inicial, roteiro para a
primeira entrada, CI, testes E2E, monitoramento operacional e um runbook de
backup e restauracao.

O proximo fechamento nao deve reescrever fundacoes prontas. Ele deve resolver
tres lacunas:

1. transformar seguranca e recuperacao documentadas em verificacoes repetiveis;
2. eliminar diferencas restantes de UX entre modulos;
3. conduzir o usuario por trabalho real, sem depender de suporte ou tours
   invasivos.

## Objetivo

Entregar um produto mais seguro, coerente e autoexplicativo, no qual um novo
usuario consiga sair do cadastro para o primeiro orcamento enviado seguindo uma
unica proxima acao por vez.

## Principios

- Ativacao acontece com trabalho real, nao com configuracao extensa.
- O app deriva progresso dos dados existentes; o usuario nao marca tarefas.
- Orientacao aparece no contexto e desaparece quando deixa de ser util.
- Acoes irreversiveis, credenciais e dados de producao nao participam de QA.
- Fundacoes de RLS, Asaas, PDF, Storage e planos sao preservadas.
- Mobile vem primeiro, com densidade media e sem componentes gigantes.
- O produto nao promete backup externo sem uma copia realmente externa.

## Escopo em tres lotes

### Lote A - Seguranca e recuperacao verificaveis

O lote audita e automatiza evidencias sem alterar contratos de pagamento.

#### Isolamento e superficie publica

- ampliar testes de isolamento entre empresas para tabelas e RPCs usadas nas
  jornadas atuais;
- confirmar que links publicos de orcamento e andamento retornam apenas campos
  permitidos;
- verificar que rotas autenticadas nao aceitam identificadores de outro
  tenant;
- revisar usos de `service_role` e manter cada bypass restrito ao servidor;
- manter webhook Asaas protegido por token, idempotencia e validacao de evento;
- manter tokens publicos imprevisiveis, URL-safe e sem dados embutidos.

#### Uploads e abuso

- validar autenticacao e pertencimento antes de processar upload;
- rejeitar tamanho, MIME, dimensoes e quantidade fora dos limites antes de
  trabalho caro sempre que possivel;
- manter resize e remocao de metadados no servidor;
- confirmar que buckets privados nao ganharam policies publicas;
- usar limites do Supabase para autenticacao e controles transacionais para
  operacoes de negocio;
- nao introduzir limitador em memoria, pois instancias serverless nao
  compartilham estado;
- registrar controles externos de firewall como operacao, sem simular garantia
  no codigo.

#### Backup e restauracao

- preservar o backup logico criptografado com `age`;
- adicionar verificacao automatica de checksum, extensao, tamanho e estrutura
  minima do pacote;
- adicionar um ensaio de restauracao isolado que nunca aceite o banco de
  producao como destino;
- validar schema, dados essenciais e RLS depois do ensaio;
- gerar registro sem PII com data, duracao, resultado e responsavel;
- manter RPO inicial de 24 horas e RTO de 4 horas.

A copia operacional definitiva exige chave `age` sob custodia do proprietario
e destino fora da maquina de desenvolvimento. O codigo pode preparar e validar
o processo, mas o gate continua pendente ate essa evidencia existir.

### Lote B - Convergencia UX/UI

O lote trabalha sobre componentes e tokens existentes. Nao cria uma terceira
identidade visual.

#### Linguagem visual

- base neutra clara para leitura e comparacao;
- verde como cor operacional e de confirmacao;
- laranja reservado para oportunidade ou acao comercial;
- cantos de ate 8 px, sombras discretas e bordas como separacao principal;
- tipografia compacta, sem escala por largura de viewport;
- paineis e formularios com largura e espacamento previsiveis;
- nenhuma secao de pagina tratada como card flutuante sem funcao.

#### Componentes compartilhados

- consolidar estados vazios com titulo, consequencia e uma acao principal;
- padronizar ajuda de campo, erro inline, estado de envio e confirmacao;
- padronizar barras de acao em mobile para respeitar navegacao e safe area;
- padronizar cabecalhos e proximas acoes sem duplicar explicacoes;
- manter icones Lucide decorativos fora da arvore acessivel;
- manter alvos de toque com no minimo 44 px e inputs com fonte que evite zoom.

#### Superficies revisadas

- Home e roteiro de ativacao;
- clientes e formulario de cliente;
- orcamentos, editor e revisao antes do envio;
- obras, diario, custos e comandos rapidos;
- financeiro e cobrancas;
- catalogo e SINAPI;
- configuracoes, plano e checkout;
- login, cadastro e onboarding inicial.

Mudancas em telas maduras devem ser justificadas por inconsistencia,
compreensao, acessibilidade ou responsividade. Nao sera feita troca cosmetica
sem ganho mensuravel.

### Lote C - Ativacao guiada por trabalho real

#### Entrada inicial

O onboarding inicial continua curto e cria somente a empresa necessaria para
usar o produto:

- nome da empresa obrigatorio;
- WhatsApp comercial, cidade e UF opcionais e explicados no contexto;
- plano escolhido preservado na URL e no redirecionamento;
- mensagens de erro junto ao campo e foco no primeiro erro;
- layout compacto, mobile-first e coerente com landing e app.

O submit continua idempotente e protegido contra criacao duplicada de empresa.

#### Sequencia de ativacao

A ordem passa a ser:

1. empresa criada;
2. primeiro cliente;
3. primeiro orcamento;
4. revisao da proposta;
5. envio do link;
6. aprovacao registrada;
7. conversao em obra;
8. configuracao de recebimento e primeira cobranca.

Pix nao bloqueia a criacao da proposta. Ele aparece antes da primeira cobranca,
quando o usuario ja entende por que precisa configura-lo.

#### Modelo de progresso

O progresso e derivado de consultas existentes:

- empresa existe;
- cliente existe;
- orcamento existe;
- orcamento foi enviado ou visualizado;
- aprovacao existe;
- obra existe;
- forma de recebimento esta pronta;
- cobranca de entrada foi gerada ou paga.

Nao sera criada tabela de checklist nesta fase. O roteiro fica aberto por
padrao enquanto a ativacao estiver incompleta, mostra uma unica proxima acao e
some quando a jornada comprovar valor.

#### Orientacao contextual

- Home mostra progresso e proxima acao;
- lista vazia de clientes leva ao primeiro cliente;
- lista vazia de orcamentos leva a criacao e explica o resultado esperado;
- editor destaca revisao e envio quando os dados estiverem suficientes;
- aprovado sem obra aponta para conversao;
- obra sem recebimento aponta para configuracao e cobranca;
- estados vazios maduros deixam de exibir instrucoes de iniciante.

Dados de exemplo permanecem opcionais, visualmente secundarios e identificados
como demonstracao. Nenhum tour, modal automatico ou tooltip obrigatorio sera
usado.

## Fluxo de dados e erros

- Server Actions e RLS continuam como autoridade de validacao.
- Componentes de orientacao recebem view models sanitizados, sem credenciais ou
  dados financeiros sensiveis.
- Falha ao calcular progresso nao bloqueia o modulo; o app mostra a acao local
  normal e registra erro estruturado.
- Sucesso conduz para o proximo passo logico sem criar redirecionamento
  inesperado para usuarios experientes.
- Eventos de produto registram etapa e origem, nunca CPF, CNPJ, telefone, chave
  Pix, token publico ou texto digitado.

## Acessibilidade e responsividade

- viewports de referencia: 375 x 812, 390 x 844, 768 x 1024 e 1440 x 900;
- sem overflow horizontal ou conteudo sob a navegacao mobile;
- foco visivel e ordem de tabulacao coerente;
- cor nunca sera o unico indicador de progresso, erro ou conclusao;
- areas dinamicas importantes usam `aria-live` sem anunciar cada mudanca
  decorativa;
- textos longos quebram linha sem alterar dimensoes de controles fixos;
- animacoes respeitam `prefers-reduced-motion`.

## Estrategia de testes

### Seguranca

- usuario da empresa A nao le nem altera recursos da empresa B;
- anonimo nao lista buckets privados nem dados internos;
- link publico nao contem custos, identificadores internos ou contexto seguro;
- upload invalido e rejeitado antes de persistir objeto;
- webhook sem token e evento duplicado nao alteram estado incorretamente.

### Recuperacao

- checksum incorreto falha fechado;
- pacote sem manifest ou dumps obrigatorios e recusado;
- destino de restauracao com marcador de producao e recusado;
- ensaio local recria schema e confirma controles essenciais;
- registro do ensaio nao contem PII.

### Produto

- conta nova cria empresa uma unica vez;
- roteiro aponta cliente como primeira acao real;
- criar cliente avanca para orcamento;
- criar e enviar orcamento atualiza progresso;
- Pix so se torna proxima acao no momento de receber;
- usuario com operacao madura nao recebe instrucoes de iniciante;
- dados de exemplo nao se confundem com dados reais;
- jornadas atuais de plano, PDF, aprovacao, obra e Asaas permanecem verdes.

### QA visual

- capturas reais, sem mockups, nos quatro viewports de referencia;
- verificacao de zoom, overflow, safe area, foco, contraste e console;
- comparacao entre landing, onboarding, Home e formularios centrais.

## Rollout

1. implementar e validar seguranca/recuperacao sem producao destrutiva;
2. publicar componentes compartilhados e Home guiada;
3. migrar onboarding e estados vazios por jornada;
4. executar suite completa, E2E e QA visual;
5. publicar em producao e fazer smoke publico e autenticado;
6. registrar separadamente a pendencia de copia externa, se ainda nao houver
   destino e chave sob custodia.

## Criterios de aceite

1. Seguranca entre tenants permanece comprovada por testes.
2. Uploads e superfices publicas falham fechado nos limites definidos.
3. Backup pode ser verificado e restaurado em ambiente isolado.
4. Nenhuma evidencia afirma backup externo inexistente.
5. Conta nova entende a primeira acao sem falar com suporte.
6. Primeiro orcamento real e priorizado sobre configuracao extensa.
7. Pix aparece no momento de cobrar, nao como barreira inicial.
8. Componentes, cores, espacamento e feedback convergem entre modulos.
9. Mobile nao apresenta zoom, overflow ou acao coberta.
10. Pagamentos, login, Supabase, PDF e planos nao sofrem regressao.
