# Prumo - Painel privado de saude operacional

Data: 2026-07-20
Status: desenho aprovado

## 1. Contexto

O Prumo ja executa diariamente um monitor operacional que verifica webhook e
disponibilidade do Asaas, checkouts, cobrancas, assinaturas e competencia
SINAPI. As execucoes e os incidentes ficam em tabelas privadas, protegidas por
RLS e acessiveis somente pela `service_role`.

Hoje o dono do produto precisa consultar banco, logs ou email para saber se a
operacao esta saudavel. O proximo incremento transforma os dados sanitizados
existentes em uma leitura interna, rapida e segura dentro do proprio Prumo.

## 2. Objetivo

Criar uma pagina compacta, responsiva e somente leitura que permita ao fundador
responder em poucos segundos:

- o monitor esta executando no prazo esperado;
- o Prumo esta saudavel, em atencao ou critico;
- quantos incidentes estao abertos;
- quais areas precisam de investigacao;
- quando cada problema apareceu e foi visto pela ultima vez.

## 3. Fora de escopo

- expor o painel para clientes ou outros `owners`;
- executar o monitor manualmente pela interface;
- resolver, ocultar, reabrir ou editar incidentes;
- corrigir pagamentos, assinaturas, webhooks ou SINAPI;
- mostrar payloads, fingerprints, IDs ou `safe_context`;
- criar um novo painel administrativo completo;
- substituir os alertas por email, logs ou o cron existente;
- alterar as regras do monitor operacional.

## 4. Decisao de produto

Sera criada a pagina `/app/configuracoes/saude-operacional`, integrada a
Configuracoes e separada do Diagnostico de producao.

O Diagnostico continua avaliando se a empresa ativa esta preparada para demo e
venda. A nova pagina mostra a saude global da plataforma. Misturar os dois
conceitos dificultaria a leitura e poderia expor dados internos para clientes.

Uma area `/admin` independente foi descartada nesta versao porque exigiria uma
nova navegacao e ampliaria o escopo sem melhorar a seguranca do caso atual.

## 5. Autorizacao

O acesso sera controlado no servidor por `OPERATIONAL_ADMIN_EMAILS`, uma lista
de emails separados por virgula. Em producao, o valor inicial sera somente
`arthurgodinho155@gmail.com`.

As regras sao:

1. normalizar os emails com `trim()` e caixa baixa;
2. comparar o email confirmado do usuario autenticado por igualdade exata;
3. negar acesso quando a variavel estiver ausente ou vazia;
4. chamar `notFound()` para qualquer usuario nao autorizado;
5. nunca usar query string, cookie editavel, role da empresa ou estado do
   cliente como prova de autorizacao;
6. nunca embutir a allowlist no bundle do navegador.

O link para a pagina aparecera em Configuracoes somente para usuarios
autorizados. Esconder o link e apenas uma conveniencia visual; a pagina repetira
a verificacao no servidor antes de consultar qualquer dado operacional.

## 6. Arquitetura

### 6.1 Nucleo de autorizacao

Um modulo server-only disponibilizara:

- parser deterministico da allowlist;
- verificacao do email autenticado;
- helper para exigir acesso ou responder como pagina inexistente.

A normalizacao tera testes unitarios e nao dependera do Supabase.

### 6.2 Leitor operacional

Um leitor server-only usara o admin client para consultar:

- a execucao mais recente de `operational_monitor_runs`;
- contagem de incidentes abertos por severidade;
- no maximo 20 incidentes abertos, criticos primeiro e depois os mais recentes.

O leitor nao reutilizara o repositorio de escrita do monitor. Ele tera uma
interface propria e somente leitura, para que a pagina nao receba metodos que
possam iniciar runs ou alterar incidentes.

### 6.3 View model sanitizado

Antes de retornar os dados para a pagina, o leitor produzira um DTO fechado com:

- estado geral;
- estado e horario da ultima execucao;
- idade da ultima execucao;
- contagens agregadas;
- area, severidade, resumo controlado, primeira ocorrencia, ultima ocorrencia e
  quantidade de repeticoes de cada incidente.

Nao farao parte do DTO:

- `fingerprint`;
- `safe_context`;
- IDs de empresa, cobranca, assinatura, webhook ou run;
- codigos e mensagens crus de fornecedores;
- documentos, nomes, emails ou telefones de clientes;
- URLs, tokens, segredos ou payloads.

`check_name` sera convertido para um rotulo fixo em portugues. Valores
desconhecidos viram "Area operacional" e nunca sao exibidos diretamente.

### 6.4 Pagina

A pagina sera um Server Component e seguira os componentes existentes:
`PageContainer`, `PageHeader`, tokens de cor do Prumo e icones Lucide.

Ela tera quatro blocos visuais, sem cards aninhados:

1. cabecalho com titulo, descricao curta e horario da atualizacao;
2. faixa de estado geral com cor, icone e proxima acao;
3. linha compacta com ultima verificacao, alertas enviados e incidentes
   abertos;
4. lista de incidentes, ou um estado vazio claro quando nao houver problemas.

No mobile, os indicadores formarao duas colunas quando houver espaco e uma
coluna em telas estreitas. A lista usara linhas densas, texto quebravel e
alvos de toque adequados, sem rolagem horizontal.

## 7. Regras de estado

A idade usa `finished_at` da ultima execucao finalizada. Para uma execucao em
`running`, usa `started_at`.

- sem execucao: `unknown`, com mensagem de que ainda nao ha evidencia;
- `running` por ate 15 minutos: `checking`;
- `running` por mais de 15 minutos: `critical`;
- ultima execucao finalizada ha ate 36 horas: dentro do prazo;
- entre 36 e 48 horas: `warning` por atraso;
- acima de 48 horas: `critical` por monitor interrompido;
- run `failed` ou incidente critico aberto: `critical`;
- run `warning` ou incidente de aviso aberto: no minimo `warning`;
- somente run `healthy`, dentro do prazo e sem incidente aberto: `healthy`.

A precedencia sera `critical`, `warning`, `checking`, `unknown`, `healthy`.
Assim, uma execucao antiga aparentemente saudavel nunca mascara a ausencia do
cron, e uma nova execucao em andamento nao mascara incidente critico aberto.

## 8. Conteudo e comportamento

Os textos serao operacionais e objetivos:

- saudavel: "Nenhuma falha operacional aberta.";
- atencao: "Ha um sinal que precisa ser acompanhado.";
- critico: "Ha uma falha que exige verificacao agora.";
- atrasado: "O monitor nao concluiu no intervalo esperado.";
- sem dados: "Ainda nao existe uma verificacao operacional registrada.";
- indisponivel: "Nao foi possivel consultar a saude do Prumo agora.".

O painel nao exibira botoes de correcao. A proxima acao orientara o fundador a
consultar o email operacional e os paineis Vercel, Supabase ou Asaas conforme a
area, sem construir links com IDs ou dados do incidente.

Datas serao apresentadas no horario de Brasilia e com texto relativo como apoio,
mantendo o timestamp acessivel no elemento `time`.

## 9. Erros e privacidade

Falha de autorizacao ocorre antes da consulta com `service_role`.

Falha de banco:

- gera log server-side com codigo interno fixo;
- mostra estado indisponivel, sem detalhes tecnicos;
- nao derruba o restante da pagina de Configuracoes;
- nao dispara novo alerta operacional nesta versao, evitando ciclo de alerta
  causado pela propria tela.

O HTML enviado ao navegador deve conter apenas o view model sanitizado. Testes
procurarao explicitamente por fingerprints, UUIDs, `safe_context`, URLs de
pagamento e nomes de campos proibidos.

## 10. Testes

### 10.1 Unidade

- allowlist vazia nega acesso;
- normalizacao aceita espacos e diferenca de caixa;
- igualdade parcial ou dominio parecido nao autoriza;
- classificacao dos limites de 15 minutos, 36 horas e 48 horas;
- precedencia entre atraso, run e incidentes;
- mapeamento de todas as areas conhecidas;
- area desconhecida usa rotulo neutro;
- DTO nao inclui campos proibidos.

### 10.2 Pagina e integracao

- usuario sem sessao segue o fluxo normal de login;
- usuario autenticado fora da allowlist recebe 404;
- usuario autorizado visualiza o link e a pagina;
- usuario nao autorizado nao visualiza o link;
- sem runs mostra estado desconhecido;
- falha de leitura mostra estado indisponivel;
- lista e limitada a 20 itens e prioriza criticos;
- estado vazio saudavel e legivel em mobile e desktop.

### 10.3 Gates

- testes focados;
- `npm run typecheck`;
- `npm run lint`;
- `npm run test`;
- `npm run build`;
- QA visual autenticado em mobile e desktop;
- smoke de producao com conta autorizada e conta comum.

## 11. Rollout

1. adicionar `OPERATIONAL_ADMIN_EMAILS` ao schema server-side;
2. configurar a variavel em Development, Preview e Production sem prefixo
   `NEXT_PUBLIC_`;
3. publicar o codigo sem alterar banco ou cron;
4. confirmar que uma conta comum recebe 404;
5. confirmar que a conta fundadora ve estado e contagens coerentes;
6. inspecionar o HTML e os logs para garantir ausencia de dados proibidos;
7. registrar evidencia sanitizada do deploy.

O rollout e aditivo e nao altera pagamentos, planos, webhook, SINAPI ou dados
de clientes. A reversao consiste em remover o link e a rota; nenhuma migration
sera necessaria.

## 12. Criterios de aceite

- somente emails autorizados no servidor acessam a pagina;
- terceiros nao distinguem a rota privada de uma pagina inexistente;
- o fundador identifica o estado geral em menos de cinco segundos;
- atraso do cron e incidente critico nunca aparecem como saudavel;
- nenhum campo proibido chega ao HTML;
- a pagina permanece somente leitura;
- o layout nao tem rolagem horizontal nem elementos superdimensionados;
- todos os gates tecnicos e o QA visual passam;
- nenhuma regressao ocorre em login, pagamento, webhook, PDF ou navegacao.
