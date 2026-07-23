# Prumo Modo Profissional V1

Data: 23 de julho de 2026
Status: aguardando revisão final

## Objetivo

Ampliar o Prumo para arquitetos, designers de interiores e engenheiros sem criar
um produto paralelo e sem enfraquecer o uso atual por empreiteiros.

O produto continuará com um único núcleo de clientes, propostas, projetos,
etapas, custos, cobranças e financeiro. O segmento escolhido pela empresa
adaptará linguagem, exemplos, modelos iniciais e orientação de uso.

O primeiro lote deve entregar valor comercial real com baixo risco para login,
pagamentos, Supabase, PDFs e dados já existentes.

## Decisão de produto

O Prumo será apresentado como:

> Propostas, projetos e financeiro para quem transforma espaços.

Os perfis disponíveis serão:

- Arquitetura
- Design de interiores
- Engenharia
- Execução de obras

`Execução de obras` será o padrão para empresas existentes. Nenhuma empresa
atual terá sua interface alterada sem escolher outro perfil.

## Alternativas consideradas

### 1. Criar uma área separada para arquitetos

Vantagem: liberdade total de interface.

Desvantagens: duplicaria clientes, propostas, projetos e regras de acesso;
aumentaria manutenção e criaria dois produtos inconsistentes.

### 2. Renomear o produto inteiro para arquitetura

Vantagem: mudança rápida de posicionamento.

Desvantagens: perderia aderência ao público atual e tornaria partes como diário,
custos e SINAPI menos claras para quem executa obras.

### 3. Adaptar o mesmo núcleo por perfil profissional

Vantagens: preserva o que já funciona, permite vender para públicos diferentes e
mantém uma única base técnica.

Desvantagem: exige centralizar o vocabulário para não espalhar condicionais pela
interface.

Esta é a abordagem escolhida.

## Escopo do primeiro lote

### 1. Perfil profissional da empresa

Adicionar `business_segment` em `companies` como texto obrigatório com os valores:

- `architecture`
- `interiors`
- `engineering`
- `construction`

A coluna terá `construction` como padrão e uma restrição no banco para impedir
valores desconhecidos.

O onboarding perguntará "Como você trabalha?" antes dos dados da empresa. As
quatro opções aparecerão como controles compactos, com ícone, nome e uma frase.
A escolha será obrigatória.

Configurações permitirá alterar o perfil depois. A mudança afeta apenas textos e
modelos futuros; nunca modifica propostas ou projetos existentes.

### 2. Vocabulário contextual

Criar um módulo puro, tipado e testável para concentrar o vocabulário do produto.
Componentes não devem implementar condicionais próprias para cada perfil.

Mapeamento inicial:

| Contexto | Arquitetura / Interiores / Engenharia | Execução de obras |
| --- | --- | --- |
| Entidade principal | Projetos | Obras |
| Documento comercial | Propostas | Orçamentos |
| Ação de conversão | Criar projeto | Virar obra |
| Identificação | Escritório | Empresa |
| Acompanhamento | Diário do projeto | Diário de obra |

As URLs e tabelas atuais permanecem iguais (`/app/obras`, `projects`, `quotes`).
Somente o texto visível muda.

O vocabulário contextual será aplicado primeiro em:

- navegação lateral e inferior;
- cabeçalhos e estados vazios de propostas e projetos;
- criação e detalhe da proposta;
- conversão de proposta aprovada;
- configurações;
- primeiros passos do painel;
- mensagens de ajuda diretamente ligadas a esses fluxos.

Textos técnicos que precisam ser inequívocos, como "orçamento financeiro da
obra", não serão trocados automaticamente.

### 3. Modelos de proposta

Na criação de uma proposta, o usuário poderá começar em branco ou selecionar um
modelo recomendado para seu perfil.

Modelos iniciais:

Arquitetura:

- Projeto arquitetônico residencial
- Reforma e interiores
- Regularização e aprovação

Design de interiores:

- Projeto de interiores residencial
- Consultoria de ambiente
- Projeto comercial compacto

Engenharia:

- Projeto estrutural
- Laudo ou vistoria técnica
- Acompanhamento técnico

Execução de obras:

- Cobertura e telhado
- Reforma residencial
- Manutenção e reparos

Cada modelo define:

- título sugerido;
- descrição clara do escopo;
- itens ou etapas comerciais editáveis;
- observações contratuais básicas e honestas;
- validade sugerida.

Preços nunca serão inventados. Os itens começam sem preço e a interface avisará
que o profissional precisa revisar escopo, quantidade e valor antes de enviar.

Os modelos serão definidos em código por enquanto. Isso evita uma nova área
administrativa e permite validar uso antes de criar modelos personalizados de
proposta.

Ao criar uma proposta com modelo:

1. a action valida o perfil e o identificador do modelo;
2. cria a proposta para a empresa autenticada;
3. insere os itens do modelo;
4. se a inserção dos itens falhar, remove a proposta recém-criada;
5. só então redireciona para o editor.

O fluxo de limite mensal do plano Grátis continua sendo validado antes da criação.

### 4. Modelos de etapas de projeto

Adicionar modelos de etapas de sistema compatíveis com a estrutura atual:

- Projeto arquitetônico residencial
- Projeto de interiores
- Acompanhamento técnico

Exemplo de fases de arquitetura:

1. briefing e levantamento;
2. estudo preliminar;
3. anteprojeto;
4. projeto executivo;
5. entrega e aceite.

Esses modelos usam `stage_templates` e `stage_template_items`, já existentes.
Eles serão opcionais ao converter uma proposta aprovada em projeto.

### 5. Landing page e posicionamento

A landing deixará de falar somente com empreiteiras. O primeiro viewport deverá
comunicar a categoria ampliada sem prometer recursos futuros.

Mudanças previstas:

- título e apoio inclusivos para arquitetura, interiores, engenharia e execução;
- seção curta de perfis atendidos;
- fluxo "proposta, aprovação, projeto e financeiro";
- exemplos reais por profissão;
- manutenção das promessas atuais de planos e pagamentos;
- metadados atualizados para a nova categoria.

Não haverá páginas separadas por profissão neste lote. A landing continua única,
mais clara e comercialmente abrangente.

### 6. Apresentação profissional ao cliente

O link público e o PDF manterão o mesmo contrato de dados. Neste lote, serão
ajustados apenas textos contextuais seguros, como "proposta" no lugar de
"orçamento" quando o perfil pedir isso.

Não serão adicionadas imagens de referência, moodboards, anexos ou assinatura
jurídica avançada neste lote.

## Arquitetura

### Domínio de segmento

Criar `web/src/lib/business-segment.ts` com:

- tipo `BusinessSegment`;
- lista de opções do onboarding;
- normalização com fallback para `construction`;
- vocabulário por segmento;
- catálogo de modelos de proposta;
- helpers puros usados por Server e Client Components.

Esse módulo não acessa Supabase nem APIs.

### Banco e tipos

Criar uma migration forward-only para `companies.business_segment`, com:

- `not null`;
- padrão `construction`;
- `check constraint`;
- comentário explicando que o valor adapta UX, não autorização.

Atualizar os tipos locais do Supabase de forma mecânica.

O segmento não participa de RLS e não libera recursos de plano.

### Consulta da empresa

As consultas de empresa devem retornar `business_segment`. O layout do app passa
o segmento normalizado para navegação e topo móvel.

Páginas que precisam de textos contextuais leem o segmento no servidor e passam
somente o vocabulário necessário aos componentes cliente.

### Compatibilidade

Se a migration ainda não estiver aplicada em um ambiente, a aplicação deve usar
`construction` como fallback para leitura. Escritas do novo onboarding exigem a
migration aplicada antes do deploy de produção.

Não haverá alteração em:

- autenticação e cadastro;
- regras RLS existentes;
- checkout e webhook Asaas;
- cálculo financeiro;
- geração de cobrança;
- regras dos planos;
- referência SINAPI;
- estrutura dos itens já salvos.

## UX e responsividade

- Mobile primeiro, sem tela adicional obrigatória após o onboarding.
- Opções de perfil com alvo de toque de pelo menos 44 px.
- Formulários compactos e sem cards aninhados.
- Modelos apresentados em lista selecionável, com "Em branco" como primeira opção.
- Descrições curtas; detalhes aparecem abaixo da seleção, sem modal.
- Em telas pequenas, ações de criar e salvar permanecem visíveis sem cobrir campos.
- Alterar perfil em Configurações exige confirmação textual de que os dados não
  serão modificados.
- Ícones vêm da biblioteca Lucide já instalada.

## Regras comerciais e de plano

O perfil profissional estará disponível nos três planos.

Modelos não serão usados como bloqueio artificial:

- Grátis: pode usar modelos, respeitando o limite atual de propostas/orçamentos;
- Pro: propostas e projetos ilimitados conforme regra atual;
- Ultimate: mantém SINAPI, importação de catálogo e exportação contábil.

Nenhum plano passará a prometer briefing, moodboard, assinatura jurídica,
cronograma visual ou agrupamento por ambiente enquanto esses recursos não forem
entregues.

## Eventos de produto

Adicionar propriedades, sem dados pessoais:

- `business_segment` em conclusão do onboarding;
- `business_segment` e `quote_template` ao criar proposta;
- evento de mudança de perfil em Configurações.

Esses dados servirão para medir ativação e uso por público.

## Erros e segurança

- Valores de segmento e modelo são validados no servidor.
- Um modelo só pode ser usado se existir no catálogo de código.
- O segmento enviado pelo cliente nunca altera plano ou autorização.
- Criação com modelo deve fazer compensação se os itens falharem.
- Logs registram identificadores técnicos, nunca nome, telefone ou documento do
  cliente.
- Mudança de perfil revalida o layout, mas não reescreve dados existentes.

## Testes e validação

Testes unitários:

- normalização de segmentos;
- vocabulário por perfil;
- catálogo de modelos;
- rejeição de segmento e modelo inválidos;
- payload de itens gerado pelo modelo;
- preservação do limite do plano Grátis.

Testes de integração existentes devem continuar cobrindo criação, edição, envio,
aprovação e conversão da proposta.

Validação obrigatória:

- suíte completa de testes;
- typecheck;
- lint;
- build de produção;
- QA mobile em 360 × 800 e 390 × 844;
- QA desktop em 1440 × 900;
- onboarding por perfil;
- criação em branco e com modelo;
- PDF e link público;
- conversão em projeto;
- navegação com empresa antiga em `construction`.

## Rollout

1. Aplicar migration em ambiente de preview.
2. Publicar aplicação no preview.
3. Criar uma empresa nova de cada perfil e validar o fluxo principal.
4. Confirmar que uma empresa antiga continua em Execução de obras.
5. Verificar PDF, link público, conversão e planos.
6. Aplicar migration em produção.
7. Publicar o mesmo commit validado.
8. Monitorar falhas de onboarding e criação de proposta.

## Fora deste lote

Recursos candidatos para ciclos posteriores, em ordem recomendada:

1. agrupamento da proposta por ambientes ou disciplinas;
2. briefing estruturado compartilhável com o cliente;
3. rodadas de alteração contratadas e consumidas;
4. cronograma visual por fases e entregáveis;
5. honorários parcelados por marco do projeto;
6. portal do cliente com arquivos e decisões;
7. catálogo de mobiliário, acabamentos e especificações;
8. apontamento de horas por fase.

Cada item será implementado somente após validar o uso do Modo Profissional V1.

## Critérios de aceite

- Uma nova empresa escolhe seu perfil durante o onboarding.
- Empresa existente continua como Execução de obras.
- Perfil pode ser alterado nas configurações.
- Navegação e fluxos principais usam vocabulário coerente.
- Usuário cria uma proposta em branco ou a partir de modelo útil.
- Modelo nunca inventa preço.
- Proposta criada por modelo pode ser editada, enviada, aprovada, convertida e
  cobrada pelos fluxos atuais.
- Modelos de etapas profissionais aparecem na conversão.
- Landing representa os quatro públicos sem promessas falsas.
- Checkout, webhook, login, PDF, RLS e regras de plano permanecem funcionais.
- Interface passa no QA mobile e desktop sem sobreposição ou zoom inesperado.
