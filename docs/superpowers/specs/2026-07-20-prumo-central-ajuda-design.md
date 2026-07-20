# Prumo: Central de Ajuda e suporte contextual

Data: 20/07/2026
Status: desenho aprovado pelo proprietário

## Contexto

O Prumo já conduz uma conta nova até cliente, orçamento, aprovação, obra e
cobrança. Ainda falta, porém, um lugar único e público para resolver dúvidas,
recuperar-se de erros e encontrar um canal real de atendimento. Hoje existem
mensagens como "entre em contato com o suporte", mas o produto não oferece uma
Central de Ajuda nem aponta sempre para um destino concreto.

Esta etapa deve aumentar autonomia e confiança sem criar uma operação de
tickets antes de existir volume que a justifique.

## Decisão

Criar uma Central de Ajuda pública em `/ajuda`, acessível com ou sem login,
organizada pelas jornadas reais do produto. O canal oficial provisório será
`arthurgodinho155@gmail.com`.

A Central de Ajuda terá busca local, tópicos curtos, perguntas frequentes e
atalhos de contato por e-mail. Não haverá chatbot, IA, formulário persistido,
tabela de tickets ou painel administrativo nesta versão.

## Objetivos

1. Permitir que alguém encontre respostas sem falar com o proprietário.
2. Oferecer suporte mesmo quando login ou cadastro não funcionarem.
3. Tornar explícito o canal de suporte e privacidade em todo o produto.
4. Reduzir mensagens genéricas que não indicam uma próxima ação.
5. Medir quais assuntos geram mais dúvida sem registrar dados pessoais.

## Fora do escopo

- Sistema de tickets, SLA ou fila de atendimento.
- Chatbot, respostas geradas por IA ou chat em tempo real.
- Anexos, captura automática de tela ou envio de logs pelo navegador.
- Base de conhecimento editável por painel administrativo.
- Identidade jurídica definitiva do fornecedor ou revisão jurídica.
- Mudanças no Asaas, Supabase, planos ou regras de autorização.

O nome ou razão social pública do fornecedor continuará como pendência até ser
definido pelo proprietário. A implementação não deve inventar esse dado.

## Arquitetura de informação

### Página pública

`/ajuda` terá uma composição compacta e mobile first:

1. Cabeçalho Prumo com ações para voltar ao início e entrar no painel.
2. Título literal "Central de Ajuda" e uma frase curta sobre o propósito.
3. Campo de busca com resultado instantâneo e contador discreto.
4. Atalhos para as principais jornadas.
5. Lista de tópicos filtrável.
6. Bloco final de contato e segurança.
7. Links para Termos e Privacidade.

Não haverá hero promocional, cards grandes, ilustrações decorativas ou seções
vazias. A página deve usar a mesma linguagem visual compacta da landing e do
app.

### Jornadas cobertas

- **Primeiros passos:** cadastro, empresa, dados opcionais e caminho inicial.
- **Clientes:** cadastro, documento, telefone e edição.
- **Orçamentos:** criação, itens, SINAPI, salvamento, PDF, envio e validade.
- **Aprovação:** link público, aceite, recusa e reenvio de link.
- **Obras:** conversão, etapas, diário, custos, equipe e andamento público.
- **Cobranças:** configuração, Pix, Asaas, entrada, saldo e estados de cobrança.
- **Planos e conta:** Grátis, Pro, Ultimate, upgrade, cancelamento e logout.
- **Segurança e privacidade:** senhas, links, dados sensíveis e canal de contato.

Cada tópico responderá uma pergunta específica em linguagem direta. Respostas
devem refletir somente comportamentos existentes no código.

## Busca

A busca será executada no navegador sobre dados estáticos tipados. Ela deve:

- normalizar maiúsculas, acentos e espaços;
- pesquisar título, resumo, palavras-chave e nome da categoria;
- atualizar resultados sem navegação ou requisição de rede;
- mostrar um estado vazio com ação para limpar a busca e contato por e-mail;
- manter o campo e os resultados utilizáveis por teclado e leitor de tela.

Não serão enviados termos pesquisados para o servidor. O analytics registrará
apenas que uma busca foi usada e se retornou resultado, nunca o texto digitado.

## Modelo de conteúdo

Os tópicos ficarão em um módulo único e tipado, separado da interface. Cada
tópico terá:

- `id` estável e sem dados pessoais;
- categoria;
- pergunta;
- resposta curta;
- lista opcional de passos;
- palavras-chave de busca;
- rota opcional para executar a ação no produto.

Esse módulo será a única fonte para busca, navegação por categoria e links
contextuais. O conteúdo não dependerá de banco de dados.

## Pontos de entrada

A Central de Ajuda será ligada a:

- menu de conta no mobile;
- rodapé da sidebar no desktop;
- seção "Mais ajustes" em Configurações;
- login e recuperação de senha;
- rodapé da landing e da página de preços;
- Termos de Uso e Política de Privacidade;
- error boundary autenticada, página 404 geral e estado de link público de
  orçamento inválido.

Links contextuais podem usar fragmentos, como `/ajuda#cobrancas`, ou o parâmetro
tipado `?topico=<id>`. Valores desconhecidos devem ser ignorados com segurança e
a página deve continuar mostrando todo o conteúdo.

## Contato

O e-mail `arthurgodinho155@gmail.com` ficará em um módulo público único para
evitar divergência entre páginas.

O link de contato usará `mailto:` com assunto relacionado ao tópico quando
aplicável. O corpo sugerido pode pedir descrição e passos para reproduzir, mas
não deve incluir automaticamente:

- ID de usuário, empresa, cliente, orçamento ou obra;
- URL contendo token público;
- CPF, CNPJ, chave Pix, senha ou dados de cartão;
- logs, cookies ou informações do dispositivo.

Ao lado do contato, haverá uma mensagem curta orientando a não enviar senhas,
documentos completos ou dados de cartão.

## Páginas legais e identidade

Termos e Privacidade passarão a exibir o e-mail aprovado como canal funcional.
A data de atualização será alterada somente porque o texto foi efetivamente
revisado.

Não será declarada razão social, CNPJ ou nome civil do fornecedor sem uma
decisão explícita do proprietário. O checklist comercial continuará mostrando
essa pendência separadamente.

## Analytics

Adicionar eventos permitidos pelo contrato atual de analytics:

- `help_center_opened`;
- `help_topic_opened` com apenas `topic_id` e `category` conhecidos;
- `help_search_used` com `has_results` e `result_count` limitado ao intervalo
  de 0 a 20;
- `support_email_clicked` com `source` e tópico opcional.

Nenhum evento conterá o termo pesquisado, e-mail, rota dinâmica, ID interno ou
conteúdo digitado pelo usuário. Esses eventos não serão enviados como conversão
para a Meta.

## Estados e comportamento

- **Conteúdo normal:** categorias e tópicos em densidade média.
- **Busca ativa:** somente resultados relevantes e ação para limpar.
- **Sem resultado:** explicação curta, limpar busca e contato.
- **Sem JavaScript:** a lista completa e o e-mail continuam visíveis.
- **Erro de analytics:** não bloqueia busca, navegação ou contato.
- **Parâmetro inválido:** ignorado sem erro e sem revelar detalhes técnicos.

## Acessibilidade e responsividade

- Um único `h1` e hierarquia correta de títulos.
- Busca com `label` visível e descrição de resultados em `aria-live` discreto.
- Alvos de toque de pelo menos 44 px nos comandos principais.
- Foco visível em links, busca, filtros e ações.
- Categorias em controles que não provoquem overflow horizontal.
- Conteúdo legível entre 320 px e 1440 px.
- Respeito a `prefers-reduced-motion` e sem animações obrigatórias.
- Texto e e-mail devem quebrar linha sem alargar a viewport.

## Segurança e privacidade

- A rota será pública e não consultará dados autenticados.
- O módulo de conteúdo não poderá importar clientes Supabase server ou admin.
- Nenhum token, segredo ou identificador interno será renderizado.
- Links externos usarão protocolos explícitos e seguros.
- O `mailto:` será construído por função testada com `URLSearchParams` ou
  codificação equivalente, sem concatenação de entrada livre.

## Componentes previstos

- página pública `web/src/app/ajuda/page.tsx`;
- componente cliente de busca e filtros;
- módulo tipado de conteúdo da ajuda;
- módulo único de contato e construção de `mailto:`;
- componente reutilizável de contato com suporte para todos os pontos de
  entrada;
- extensões do contrato de eventos do produto.

A implementação deve reutilizar `Button`, `Input`, `PageContainer` quando
compatível e ícones Lucide já instalados. Não deve criar um segundo sistema de
design.

## Testes

### Unidade

- normalização e busca com e sem acentos;
- filtro por categoria;
- tópico e parâmetro desconhecidos;
- construção segura do `mailto:`;
- garantia de que analytics não recebe texto pesquisado.

### Integração e E2E

- `/ajuda` abre sem autenticação;
- busca encontra tópico por título e palavra-chave;
- estado sem resultado pode ser recuperado;
- links da landing, login, app, configurações, Termos e Privacidade chegam à
  Central de Ajuda;
- menu mobile e sidebar desktop exibem Ajuda e suporte;
- página não possui overflow nas viewports de referência;
- console não apresenta erros;
- HTML público não contém IDs internos ou segredos.

### Gate de qualidade

- lint;
- typecheck;
- testes unitários;
- auditoria de dependências;
- build;
- E2E público e autenticado em desktop e mobile;
- QA visual na aplicação real, sem mockup.

## Critérios de aceite

1. Uma pessoa deslogada consegue encontrar ajuda e o e-mail de suporte.
2. Uma pessoa logada encontra a central pelo mobile e desktop em até dois
   comandos.
3. Busca por termos como "Pix", "orçamento", "SINAPI" e "cancelar" retorna
   conteúdo fiel ao produto.
4. Busca sem resultado oferece recuperação clara.
5. Termos, Privacidade e erros deixam de mencionar suporte sem destino.
6. Nenhum dado sensível ou termo pesquisado é enviado por analytics.
7. Mobile e desktop passam sem overflow, sobreposição ou erro de console.
8. Build, testes e CI terminam verdes.

## Sequência de implementação

1. Criar fonte tipada de conteúdo, busca e contato com testes unitários.
2. Construir a página pública e seus estados.
3. Integrar navegação pública e autenticada.
4. Atualizar contato legal e recuperação de erros.
5. Adicionar analytics sem PII.
6. Executar validação técnica e QA visual real.
7. Commitar, publicar e confirmar produção.
