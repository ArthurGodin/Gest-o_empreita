# Prumo: continuidade da demo ao onboarding

**Data:** 10/08/2026  
**Status:** desenho aprovado para implementacao

## Objetivo

Preservar a area profissional escolhida na demonstracao publica durante o
cadastro, a comparacao de planos e o onboarding. A pessoa deve sentir que esta
continuando a mesma jornada, sem precisar repetir uma escolha e sem perder a
possibilidade de corrigi-la.

O fluxo deve reduzir atrito de aquisicao sem alterar plano, permissao,
pagamento, dados financeiros ou regras de negocio.

## Contexto atual

O Prumo ja possui quatro perfis reais e um onboarding em duas etapas:

- Arquitetura;
- Design de interiores;
- Engenharia;
- Execucao de obras.

O perfil adapta vocabulario, modelos e trilhas de ativacao. O onboarding tambem
pergunta qual primeiro resultado a pessoa procura. A demonstracao publica usa os
mesmos quatro perfis, mas seus links atuais apontam para `/signup` e `/precos`
sem preservar a escolha ativa.

A lacuna nao e criar outro onboarding. E conectar corretamente superficies que
ja funcionam.

## Abordagens consideradas

### 1. Query string validada

Propagar `perfil` por URLs publicas e validar o valor em cada fronteira. Esta e
a abordagem escolhida porque e explicita, testavel, compartilhavel e funciona
sem armazenamento oculto no navegador.

### 2. `sessionStorage` ou `localStorage`

Evita mostrar o contexto na URL, mas pode desaparecer entre abas, navegadores,
dispositivos e modos privados. Tambem cria uma fonte de estado invisivel e mais
dificil de depurar.

### 3. Metadados do Supabase Auth

Persistiria a escolha cedo, mas exigiria uma gravacao de identidade antes de a
empresa existir e acoplaria aquisicao ao modelo de autenticacao. E complexidade
desnecessaria para um dado ainda editavel.

## Experiencia escolhida

1. A pessoa seleciona um perfil na demo.
2. `Criar conta` abre `/signup?perfil=<perfil>`.
3. `Ver planos` abre `/precos?perfil=<perfil>`.
4. A pagina de precos preserva `perfil` em todos os links de cadastro e combina
   o parametro com `plan` quando o plano for Pro ou Ultimate.
5. O cadastro mostra uma linha contextual curta indicando para qual area o
   espaco sera preparado.
6. O cadastro envia o perfil validado para a Server Action.
7. A Server Action preserva o perfil no redirecionamento ao onboarding.
8. O onboarding abre com o perfil visivelmente pre-selecionado.
9. A pessoa pode trocar o perfil antes de continuar.
10. A segunda etapa continua perguntando o objetivo inicial, pois o perfil nao
    determina se a prioridade e vender, organizar trabalho contratado, coletar
    briefing, preparar entregas ou controlar execucao.

O perfil nao sera selecionado silenciosamente nem escondido. A etapa continua
necessaria para informar nome profissional e contato comercial.

## Continuidade pelo login

O link `Ja tem conta? Entrar` preserva `perfil` e `plan`. Depois do login:

- conta com empresa existente segue para `/app` e ignora o perfil de aquisicao;
- conta autenticada sem empresa segue para o onboarding com perfil e plano;
- valor de perfil invalido e descartado.

Esse comportamento evita mudar uma empresa existente por causa de um link
publico.

## Contrato de URL e validacao

O parametro publico sera `perfil` e aceitara somente:

- `architecture`;
- `interiors`;
- `engineering`;
- `construction`.

`plan` continua aceitando apenas `pro` e `ultimate`; ausencia significa Gratis.

Um helper puro centralizara leitura e construcao dos links do funil. Ele usara
`URLSearchParams`, nunca concatenacao de valores arbitrarios. Perfil desconhecido
sera tratado como ausente, sem fallback automatico para Obras. Isso evita que
uma URL incorreta pareca uma escolha real do visitante.

## Interface

### Demonstracao

- Os CTAs do cabecalho e do encerramento usam o perfil ativo.
- O link de precos tambem preserva o perfil.
- Nenhuma nova caixa ou etapa sera adicionada a demo.

### Cadastro

- Um contexto compacto aparece somente quando `perfil` for valido.
- O texto usa o rotulo oficial, por exemplo `Preparando seu espaco para
  Arquitetura`.
- O formulario, a hierarquia e os campos atuais permanecem.

### Precos

- A aparencia e o conteudo dos planos nao mudam.
- Cabecalho e tres CTAs de plano preservam o perfil recebido.
- A URL canonica continua `/precos` para nao criar paginas duplicadas em busca.

### Onboarding

- O seletor existente recebe o perfil como valor inicial.
- Uma descricao curta informa que a sugestao veio da demonstracao e pode ser
  alterada.
- Trocar o perfil limpa qualquer objetivo incompativel, como ja ocorre hoje.
- Sem `perfil` valido, o onboarding continua exatamente como esta.

## Arquitetura

### Helper de contexto

Uma unidade pura sera responsavel por:

- validar `perfil`;
- validar `plan` reutilizando o dominio atual de planos;
- construir links de cadastro, precos, login e onboarding;
- omitir parametros ausentes ou invalidos.

Ela nao acessara `window`, cookies, Supabase ou Asaas.

### Fronteiras

- Componentes clientes leem a query atual e enviam apenas valores validados.
- Server Actions repetem a validacao; campos ocultos nunca sao confiaveis.
- A pagina de onboarding valida novamente antes de fornecer o valor inicial.
- A persistencia definitiva continua ocorrendo somente em
  `createCompanyAction`, junto da criacao da empresa.

## Seguranca e privacidade

- O perfil e uma preferencia comercial nao sensivel.
- Nenhum nome, email, telefone, CPF, CNPJ ou identificador interno entra na URL.
- Parametros nao concedem plano, recurso, permissao ou desconto.
- `plan=pro` e `plan=ultimate` continuam apenas direcionando ao checkout depois
  do onboarding; a ativacao depende das regras de pagamento existentes.
- Uma conta com empresa nunca tem seu perfil alterado pelo funil publico.
- Nenhuma mudanca sera feita em webhook, Asaas, RLS ou schema do banco.

## Analytics

Eventos existentes continuarao sendo usados. Quando houver perfil valido, sera
permitida a propriedade nao pessoal `business_segment` nos eventos de cadastro
e onboarding.

O objetivo e medir se cada perfil chega ao cadastro e conclui a ativacao, sem
registrar dados pessoais.

## Tratamento de falhas

- Perfil ausente: fluxo generico atual.
- Perfil invalido: parametro descartado e fluxo generico.
- Plano invalido: tratado como Gratis pelas regras existentes.
- Troca de perfil no onboarding: objetivo anterior e limpo.
- Falha de analytics: navegacao e cadastro continuam.
- Recarregar cadastro, precos ou onboarding: contexto permanece pela URL.
- Conta existente: contexto publico nao sobrescreve dados da empresa.

## Testes

### Unidade

- aceita os quatro perfis suportados;
- rejeita valores desconhecidos, vazios ou repetidos de forma insegura;
- combina `perfil` com Gratis, Pro e Ultimate;
- constroi URLs com codificacao correta;
- omite valores ausentes.

### Integracao

- os CTAs da demo refletem o perfil ativo;
- precos preserva perfil nos quatro caminhos de cadastro;
- signup envia e redireciona com perfil e plano;
- login preserva contexto apenas para conta sem empresa;
- onboarding recebe valor inicial validado;
- Server Actions rejeitam adulteracao sem quebrar o fluxo;
- empresa criada persiste exatamente o perfil confirmado no seletor.

### QA de navegador

- demo de cada perfil para cadastro;
- demo para precos e depois cadastro em cada plano;
- alteracao do perfil pre-selecionado;
- acesso direto sem parametros;
- parametros invalidos;
- mobile em 360 x 800 e 390 x 844;
- desktop em 1440 x 900;
- teclado, foco visivel, dark mode e ausencia de overflow;
- nenhuma chamada a Asaas antes do checkout existente.

### Gates

- testes focados e suite completa;
- lint;
- typecheck;
- build de producao;
- QA visual e funcional em navegador.

## Rollout e rollback

Nao ha migration. A mudanca entra em commit isolado e pode ser revertida
removendo o helper, os parametros dos links e os valores iniciais. URLs antigas
continuam validas durante e depois do rollout.

## Fora de escopo

- escolher objetivo automaticamente pela secao aberta na demo;
- criar novo onboarding;
- preencher nome, telefone, cidade ou UF;
- armazenar contexto em cookie ou armazenamento local;
- mudar precos, promessas ou limites dos planos;
- alterar checkout, cobranca, webhook ou ativacao de assinatura;
- modificar dados de empresas existentes;
- criar templates novos neste lote.

## Criterios de aceite

- o perfil escolhido na demo chega ao onboarding em todos os CTAs comerciais;
- o perfil aparece pre-selecionado, visivel e editavel;
- o objetivo continua sendo uma decisao consciente do usuario;
- perfis invalidos nunca sao persistidos;
- planos pagos preservam seu redirecionamento atual;
- contas existentes nao sofrem alteracao;
- fluxo sem parametros permanece identico;
- nenhuma chamada financeira nova e introduzida;
- testes, lint, typecheck, build e QA passam.
