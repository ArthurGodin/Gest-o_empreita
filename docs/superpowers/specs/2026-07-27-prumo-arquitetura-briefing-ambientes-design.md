# Prumo Arquitetura V1 - Briefing e Ambientes

Data: 27 de julho de 2026
Status: desenho aprovado; especificação aguardando revisão final

## 1. Objetivo

Transformar o modo profissional do Prumo em uma ferramenta de uso recorrente
para escritórios de arquitetura e design de interiores.

O primeiro lote deve resolver duas tarefas centrais:

1. coletar e revisar um briefing profissional com o cliente;
2. organizar o programa de necessidades por ambiente.

O recurso deve aumentar o valor percebido do plano Pro, funcionar bem no
celular e usar a infraestrutura atual de Next.js, Supabase e Vercel. Não serão
adicionados serviços pagos externos.

## 2. Resultado esperado

Depois deste lote, um escritório poderá:

- criar um projeto a partir de uma proposta aprovada;
- escolher um modelo de briefing adequado ao tipo de projeto;
- enviar o briefing ao cliente por link, sem exigir conta;
- acompanhar o preenchimento e as pendências;
- revisar respostas sem perder versões anteriores;
- transformar as respostas em ambientes e necessidades organizadas;
- continuar o trabalho nas etapas e entregas já existentes;
- identificar rapidamente a próxima ação necessária.

O cliente poderá preencher o briefing aos poucos pelo celular, revisar as
respostas e fazer um envio definitivo.

## 3. Decisão de produto

O Prumo não terá um segundo aplicativo nem uma área duplicada para arquitetos.
Empresas com segmento `architecture` ou `interiors` receberão um workspace
contextual dentro de cada projeto.

Esse workspace organizará os recursos nas seguintes áreas:

- Resumo;
- Briefing;
- Ambientes;
- Etapas;
- Entregas;
- Gestão.

`Gestão` reúne as superfícies atuais de cobrança, diário, custos e equipe. Essa
organização reduz a quantidade de destinos visíveis sem remover recursos.

Empresas de engenharia e execução de obras preservam a experiência atual neste
lote. A estrutura de briefing poderá atender engenharia depois de validar o
produto com Arquitetura e Interiores.

## 4. Alternativas consideradas

### 4.1. Área de Arquitetura separada

Criar um destino independente no menu daria maior liberdade visual, mas
duplicaria clientes, projetos, financeiro, permissões e regras de plano.
Também criaria dois produtos difíceis de manter.

### 4.2. Workspace contextual no projeto

O projeto existente continua sendo a unidade principal. Briefing e ambientes
são adicionados ao mesmo fluxo de etapas, entregas e cobrança.

Esta é a alternativa escolhida porque cria uma experiência específica sem
fragmentar o produto ou os dados.

### 4.3. Construtor genérico de formulários

Um construtor totalmente livre atenderia vários mercados, mas exigiria muita
configuração antes de gerar valor. Modelos profissionais prontos reduzem o
tempo até o primeiro resultado. A personalização avançada será um diferencial
do plano Ultimate.

## 5. Escopo do primeiro lote

### 5.1. Briefing interno

O profissional poderá:

- criar um briefing a partir de um modelo compatível com o segmento;
- visualizar progresso, estado e última atividade;
- revisar respostas do cliente;
- complementar observações internas separadas das respostas públicas;
- reabrir um briefing enviado, preservando a revisão anterior;
- copiar necessidades selecionadas para os ambientes do projeto;
- arquivar um briefing sem excluir o histórico.

Estados do briefing:

- `draft`: criado, ainda não compartilhado;
- `shared`: compartilhado e disponível para preenchimento;
- `submitted`: enviado pelo cliente e congelado para revisão;
- `reviewed`: revisado pelo escritório;
- `archived`: retirado do fluxo ativo, com histórico preservado.

Um projeto terá no máximo um briefing ativo. Revisões pertencem ao mesmo
briefing e recebem numeração sequencial.

### 5.2. Briefing público

O portal público existente receberá uma seção `Briefing` quando o projeto tiver
um briefing compartilhado.

O cliente poderá:

- preencher blocos curtos;
- salvar automaticamente;
- retomar o preenchimento no mesmo link;
- ver o percentual concluído;
- revisar todas as respostas;
- fazer o envio definitivo;
- identificar quais campos obrigatórios ainda faltam.

Depois do envio, as respostas ficam somente para leitura. Se o escritório
reabrir o briefing, uma nova revisão editável será criada a partir da anterior.

O portal não permitirá que o cliente altere observações internas, ambientes,
etapas, custos, cobranças ou outros dados privados.

### 5.3. Modelos iniciais

Serão entregues três modelos de sistema:

1. Projeto arquitetônico residencial;
2. Projeto de interiores residencial;
3. Projeto comercial compacto.

Os modelos poderão usar os seguintes tipos de pergunta:

- texto curto;
- texto longo;
- escolha única;
- escolha múltipla;
- sim ou não;
- número;
- moeda;
- data;
- escala de prioridade.

Cada modelo será dividido em:

- Sobre o projeto;
- Pessoas e rotina;
- Necessidades e prioridades;
- Estilo e referências;
- Investimento e prazo;
- Restrições e observações.

As perguntas devem ser objetivas e úteis ao desenvolvimento do projeto. O
Prumo não fará recomendações técnicas, jurídicas ou financeiras com base nas
respostas.

### 5.4. Ambientes

O profissional poderá:

- adicionar um ambiente manualmente;
- criar ambientes a partir de respostas selecionadas do briefing;
- duplicar um ambiente;
- reordenar ambientes;
- registrar área opcional;
- definir prioridade;
- registrar necessidades, restrições e observações;
- marcar o ambiente como incompleto ou definido;
- arquivar sem excluir.

Cada ambiente apresentará:

- nome;
- tipo;
- área em metros quadrados, quando informada;
- prioridade;
- quantidade de necessidades;
- quantidade de pendências;
- estado;
- última atualização.

As necessidades serão registros independentes para permitir conclusão,
priorização e uso posterior pela Central de Decisões.

### 5.5. Resumo do projeto

O resumo destacará somente informações acionáveis:

- percentual do briefing;
- estado do briefing;
- data da última resposta;
- ambientes incompletos;
- necessidades pendentes;
- entregas aguardando cliente;
- próxima ação recomendada.

Exemplos:

- `Briefing 72% preenchido`;
- `Cliente enviou novas respostas`;
- `3 ambientes sem prioridade`;
- `2 entregas aguardam revisão`.

O resumo não substituirá o painel geral da empresa.

## 6. Fora do escopo

Este lote não inclui:

- desenho, edição ou visualização de CAD, DWG, RVT ou BIM;
- geração automática de projeto por inteligência artificial;
- moodboard visual interno;
- upload de referências pelo cliente;
- catálogo de mobiliário, fornecedores ou acabamentos;
- orçamento automático baseado no briefing;
- cronograma gráfico;
- apontamento de horas;
- Central de Decisões completa;
- modelos personalizados do Ultimate;
- exportação do programa de necessidades;
- mudança de preços dos planos.

Esses recursos só poderão ser anunciados depois de implementados e validados.

## 7. Arquitetura funcional

### 7.1. Limites dos módulos

O recurso será separado em unidades com responsabilidades claras:

- `briefing catalog`: modelos de sistema e validação de schemas;
- `briefing domain`: estados, progresso, revisões e limites;
- `briefing queries`: leitura interna autenticada;
- `briefing public queries`: contrato mínimo do portal público;
- `briefing actions`: criação, compartilhamento, revisão e arquivamento;
- `spaces domain`: ambientes, necessidades, ordenação e limites;
- componentes internos do workspace;
- componentes públicos do formulário.

Componentes visuais não acessarão diretamente credenciais administrativas.
Validação de negócio será centralizada em módulos de domínio e repetida nas
barreiras do banco quando houver risco de concorrência.

### 7.2. Fluxo de criação

1. O usuário autenticado abre um projeto.
2. O servidor confirma empresa, segmento e limite do plano.
3. O usuário escolhe um modelo.
4. O Prumo cria o briefing e uma primeira revisão.
5. A revisão recebe um snapshot imutável do schema do modelo.
6. O profissional revisa o formulário antes de compartilhar.
7. O link público reutiliza o token seguro do projeto.

O snapshot impede que alterações futuras no catálogo modifiquem projetos
existentes.

### 7.3. Fluxo público

1. O portal valida sintaxe e tamanho do token.
2. O servidor encontra o projeto por comparação exata.
3. O contrato público retorna somente título do projeto, identificação segura
   do escritório, schema do briefing e respostas públicas.
4. O cliente salva respostas por blocos.
5. Cada salvamento valida revisão ativa, tipo, tamanho e permissões.
6. O envio definitivo bloqueia a revisão e registra data e nome do respondente.
7. O escritório recebe uma pendência e, quando configurado, notificação por
   e-mail.

Salvamento e envio serão idempotentes para tolerar toque duplo e reenvio de
rede.

### 7.4. Fluxo de reabertura

1. O escritório solicita a reabertura e informa uma orientação opcional.
2. O servidor bloqueia o briefing.
3. Confirma que a revisão atual está enviada.
4. Cria uma nova revisão a partir do schema e respostas anteriores.
5. Mantém a revisão anterior imutável.
6. O portal passa a exibir a nova revisão editável.

## 8. Modelo de dados

### 8.1. `project_briefings`

Representa o briefing permanente do projeto:

- `id`;
- `company_id`;
- `project_id`;
- `template_key`;
- `status`;
- `active_revision_id`, opcional durante a criação;
- `internal_notes`, opcional;
- `shared_at`, opcional;
- `reviewed_at`, opcional;
- `archived_at`, opcional;
- `created_by`;
- `created_at`;
- `updated_at`.

Restrições:

- no máximo um briefing não arquivado por projeto;
- empresa e projeto devem formar a mesma cadeia de propriedade;
- estados e datas precisam ser coerentes.

### 8.2. `project_briefing_revisions`

Representa uma rodada de respostas:

- `id`;
- `company_id`;
- `project_id`;
- `briefing_id`;
- `revision_number`;
- `schema_version`;
- `schema_snapshot` em JSONB;
- `answers` em JSONB;
- `respondent_name`, opcional antes do envio;
- `reopen_note`, opcional;
- `submitted_at`, opcional;
- `created_at`;
- `updated_at`.

Restrições:

- número positivo e único por briefing;
- schema validado no servidor antes da gravação;
- revisão enviada não pode ter respostas alteradas;
- somente a revisão ativa pode receber salvamentos;
- respostas são limitadas por tipo e tamanho.

O JSONB será usado apenas para o documento versionado do formulário. Ambientes
e necessidades, que precisam de consulta e atualização independentes, serão
normalizados.

### 8.3. `project_spaces`

Representa um ambiente:

- `id`;
- `company_id`;
- `project_id`;
- `name`;
- `space_type`;
- `area_m2`, opcional;
- `priority`;
- `status`;
- `notes`, opcional;
- `position`;
- `archived_at`, opcional;
- `created_by`;
- `created_at`;
- `updated_at`.

### 8.4. `project_space_requirements`

Representa uma necessidade ou restrição:

- `id`;
- `company_id`;
- `project_id`;
- `space_id`;
- `kind`: `need`, `constraint` ou `preference`;
- `description`;
- `priority`;
- `status`: `pending` ou `defined`;
- `source_revision_id`, opcional;
- `position`;
- `created_by`;
- `created_at`;
- `updated_at`.

`source_revision_id` permite rastrear uma necessidade criada a partir do
briefing sem acoplar o formulário ao ambiente.

## 9. Regras de planos

### 9.1. Grátis

- um briefing ativo por empresa;
- uma revisão compartilhada;
- até três ambientes ativos;
- fluxo público completo para experimentar o recurso;
- dados existentes continuam legíveis depois de atingir um limite.

### 9.2. Pro

- briefings em todos os projetos permitidos pelo plano;
- ambientes suficientes para uso profissional normal;
- modelos de sistema;
- revisões de briefing;
- painel de progresso e pendências;
- integração com etapas e entregas.

O produto poderá aplicar limites técnicos altos para proteção contra abuso, mas
não anunciará `ilimitado` se houver um limite efetivo.

### 9.3. Ultimate

Neste lote, o Ultimate recebe tudo do Pro. A interface pode indicar como
próximos diferenciais, sem anunciá-los como disponíveis:

- modelos personalizados;
- campos próprios;
- identidade do escritório;
- exportação do programa de necessidades.

Esses diferenciais exigem um lote posterior antes de aparecerem na landing ou
na tabela pública de preços.

### 9.4. Bloqueios

Todos os limites serão verificados no servidor e, quando necessário, no banco.
O bloqueio nunca apagará, ocultará ou tornará inacessíveis os dados existentes.

A mensagem de upgrade deve informar:

- qual limite foi atingido;
- o que continua disponível;
- qual plano libera a próxima ação.

## 10. UX e responsividade

### 10.1. Navegação

Em Arquitetura e Interiores, a navegação do projeto será agrupada em:

- Resumo;
- Briefing;
- Ambientes;
- Etapas;
- Entregas;
- Gestão.

No desktop, os destinos usam abas compactas. No celular, usam um seletor de
seção estável, com alvo de toque mínimo de 44 px e sem zoom inesperado.

### 10.2. Formulário público

- blocos curtos, com uma ideia principal por tela ou seção;
- indicador textual e visual de progresso;
- salvamento automático com estado `Salvando`, `Salvo` ou `Falha ao salvar`;
- campos com teclado móvel adequado ao tipo;
- botões de avançar e voltar sem apagar respostas;
- resumo final antes do envio;
- erros próximos ao campo;
- retorno ao ponto em que o cliente parou;
- suporte a redução de movimento;
- contraste e foco visível.

O formulário não terá uma tela longa com todas as perguntas expostas de uma
vez.

### 10.3. Ambientes

- lista compacta e escaneável;
- edição focada no celular;
- duplicação para ambientes semelhantes;
- reordenação com alternativa acessível sem arrastar;
- criação rápida de necessidade;
- contadores estáveis, sem deslocar o layout;
- ações secundárias em menu;
- confirmação para arquivamento.

### 10.4. Estados vazios

Cada estado vazio terá uma única próxima ação.

Exemplos:

- `Comece pelo briefing para entender necessidades, prioridades e limites do projeto.`
- `Organize o programa de necessidades adicionando o primeiro ambiente.`

Não haverá textos promocionais longos dentro do app operacional.

## 11. Segurança e privacidade

- Todas as novas tabelas usarão RLS por `company_id`.
- Usuários autenticados só acessarão empresas das quais participam.
- O portal público usará cliente administrativo somente depois de validar
  token e cadeia de propriedade.
- O contrato público excluirá notas internas, custos e metadados privados.
- Token bruto, respostas, nomes e referências não serão gravados em logs.
- Eventos de produto não incluirão conteúdo respondido pelo cliente.
- Escritas públicas terão proteção contra abuso e tamanho máximo de payload.
- Funções de envio e reabertura usarão transação e bloqueio para evitar
  revisões concorrentes.
- Erros públicos responderão de forma neutra quando token ou recurso forem
  inválidos.

## 12. Tratamento de erros

- Falha de rede mantém o rascunho local e permite repetir o salvamento.
- Resposta incompatível com o schema é rejeitada antes da persistência.
- Envio com campos obrigatórios ausentes lista as seções incompletas.
- Revisão já enviada retorna o estado atual sem duplicar o envio.
- Reabertura concorrente retorna a revisão ativa existente.
- Limite de plano informa consumo e alternativa de upgrade.
- Falha de e-mail não reverte o envio do briefing.
- Migration ausente não deve quebrar projetos de segmentos não habilitados; o
  rollout só ativa a interface depois da migration aplicada.

## 13. Eventos de produto

Eventos sem dados pessoais:

- briefing criado;
- briefing compartilhado;
- briefing aberto;
- primeiro bloco salvo;
- progresso em 25%, 50%, 75% e 100%;
- briefing enviado;
- briefing revisado;
- briefing reaberto;
- ambiente criado;
- necessidade criada;
- limite de plano atingido;
- upgrade iniciado a partir do briefing ou de ambientes.

Esses eventos devem permitir medir:

- tempo até compartilhar;
- taxa de abertura;
- taxa de conclusão;
- uso recorrente por segmento;
- conversão do Grátis para Pro.

## 14. Testes e validação

### 14.1. Unidade

- validação dos três schemas de sistema;
- cálculo de progresso;
- normalização de respostas;
- transições de estado;
- limites por plano;
- derivação de pendências;
- criação de ambientes a partir de respostas;
- mensagens contextuais por segmento.

### 14.2. Banco e integração

- isolamento entre duas empresas;
- projeto de outra empresa rejeitado;
- um briefing ativo por projeto;
- revisão enviada imutável;
- numeração concorrente de revisão;
- envio e reabertura idempotentes;
- token público inválido;
- contrato público sem campos internos;
- limites do Grátis;
- ordenação e arquivamento de ambientes;
- rastreamento da origem de necessidades.

### 14.3. E2E

1. escritório de arquitetura cria projeto;
2. cria briefing residencial;
3. compartilha o link;
4. cliente preenche em duas sessões no celular;
5. cliente revisa e envia;
6. escritório recebe a pendência e revisa;
7. cria ambientes a partir das respostas;
8. complementa e reordena necessidades;
9. segue para etapas e entregas;
10. dados permanecem após recarregar e em outro dispositivo.

Também haverá cenários para Interiores, limite Grátis, reabertura e falha de
rede durante salvamento.

### 14.4. Gate de qualidade

- typecheck;
- lint sem cache;
- suíte completa de testes;
- build de produção;
- E2E focado;
- QA em 360x800, 390x844, 768x1024 e 1440x900;
- ausência de overflow, zoom inesperado e controles inacessíveis;
- verificação de login, proposta, PDF, Asaas, cobrança e entregas existentes.

## 15. Rollout

1. Criar migration aditiva, tipos e domínio sem ativar a interface.
2. Validar RLS, funções e schemas localmente.
3. Ativar workspace interno em preview para Arquitetura e Interiores.
4. Validar briefing público com token de projeto.
5. Executar E2E e regressão dos fluxos atuais.
6. Preparar kit de demonstração contextual.
7. Aplicar migration em produção.
8. Publicar o mesmo commit validado.
9. Monitorar criação, abertura, conclusão, erros e limites.
10. Só então atualizar landing, preços e Central de Ajuda com promessas
    comprovadas.

Um rollback visual pode esconder Briefing e Ambientes sem remover os dados.
Migrações não serão revertidas destrutivamente.

## 16. Próximos lotes

Ordem recomendada depois da validação deste núcleo:

1. Central de Decisões ligada a ambientes, etapas e entregas;
2. modelos personalizados e identidade do escritório no Ultimate;
3. exportação do programa de necessidades;
4. referências visuais e moodboard;
5. especificações de materiais, mobiliário e fornecedores;
6. horas e rentabilidade por fase;
7. parcelas de honorários por marco do projeto.

Cada lote terá especificação própria e só será anunciado quando estiver
funcional.

## 17. Critérios de aceite

O lote estará pronto quando:

- Arquitetura e Interiores visualizarem o workspace contextual;
- o escritório criar um briefing a partir de qualquer modelo de sistema;
- o cliente preencher, salvar, retomar e enviar pelo celular sem login;
- respostas enviadas permanecerem imutáveis;
- reabertura criar uma nova revisão;
- o escritório organizar ambientes e necessidades;
- limites do Grátis e do Pro funcionarem no servidor;
- dados nunca atravessarem empresas;
- portal público não expuser informações internas;
- resumo mostrar pendências e próxima ação úteis;
- planos e landing prometerem somente o que foi entregue;
- fluxos existentes de login, proposta, PDF, Asaas, cobrança, SINAPI e
  entregáveis continuarem funcionais;
- todos os gates de teste e QA passarem.
