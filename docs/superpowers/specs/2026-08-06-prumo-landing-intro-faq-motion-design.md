# Prumo: abertura de marca e movimento do FAQ

**Data:** 06/08/2026  
**Status:** direcao aprovada para implementacao

## Objetivo

Dar uma assinatura de entrada reconhecivel a landing e tornar a secao de duvidas
frequentes mais agradavel de explorar, sem atrasar a leitura, prejudicar conversao
ou transformar movimento em obstaculo no celular.

## Abordagens consideradas

1. Splash screen tradicional com espera. Tem presenca visual, mas bloqueia o
   conteudo e pode transmitir lentidao.
2. Animar apenas o hero existente. E a opcao mais leve, mas nao cria o momento de
   marca solicitado e repete o movimento que a landing ja possui.
3. Revelacao curta sobre conteudo pronto. A marca aparece em uma camada temporaria
   e a camada se abre para revelar o hero ja renderizado. Esta e a abordagem
   escolhida por combinar identidade, velocidade percebida e rollback simples.

## Abertura da landing

- Uma camada verde-grafite cobre a viewport e mostra o simbolo, o nome `Prumo` e
  um detalhe topografico discreto derivado da identidade atual.
- A composicao permanece por poucos instantes e sai em duas partes, como uma
  cortina tecnica. A experiencia completa deve durar aproximadamente 1 segundo e
  nunca esperar rede, imagem ou canvas.
- O hero completo existe por baixo desde o HTML inicial. A abertura nao controla
  o carregamento do produto e nao altera SEO, links ou analytics.
- A abertura aparece apenas uma vez por sessao do navegador. Navegar e voltar para
  a landing na mesma sessao nao repete o efeito.
- `prefers-reduced-motion`, economia de dados e falhas de armazenamento removem a
  animacao sem remover o conteudo.
- Um temporizador de seguranca desmonta a camada mesmo se a animacao nao emitir o
  evento esperado.
- A camada e decorativa, nao recebe foco e nao contem comando obrigatorio.

## FAQ

- Continua sendo um accordion de item unico: abrir uma resposta fecha a anterior.
- Altura, opacidade, borda e chevron mudam em conjunto, com duracao curta e easing
  consistente com o restante da landing.
- Cada item recebe uma entrada discreta quando chega ao viewport, usando a
  infraestrutura de revelacao ja existente.
- Estado aberto ganha contraste e uma linha esmeralda pequena, sem aumentar o
  tamanho dos cards nem criar superficies decorativas adicionais.
- Botoes mantem `aria-expanded`, `aria-controls`, foco visivel e alvo de toque de
  pelo menos 44 px. As respostas permanecem associadas ao respectivo botao.
- Movimento reduzido preserva a abertura e o fechamento, mas sem transicao.

## Arquitetura

- `LandingIntro` sera um componente cliente isolado e montado somente na rota
  publica `/`.
- A decisao de exibir sera separada em uma funcao pura para permitir teste sem
  navegador.
- `LandingFaq` preserva os textos atuais e recebe apenas estado visual e transicao.
- CSS global recebe classes com prefixo `landing-` e keyframes dedicados. Nenhuma
  biblioteca nova sera instalada.
- Login, cadastro, precos, checkout, Supabase, Asaas e app autenticado ficam fora
  do escopo.

## Desempenho e acessibilidade

- Animacoes usam `transform` e `opacity`; a expansao curta do FAQ fica limitada ao
  proprio item.
- Nenhuma imagem adicional de rede e necessaria para a abertura.
- A camada nao altera dimensoes do documento e nao gera rolagem horizontal.
- O conteudo continua utilizavel sem JavaScript; se o componente nao montar, nao
  existe camada persistente bloqueando a pagina.
- A implementacao sera conferida em mobile, desktop e movimento reduzido.

## Validacao

- Primeira abertura da sessao mostra e remove a cortina.
- Reentrada na mesma sessao nao repete a abertura.
- Movimento reduzido e economia de dados pulam a abertura.
- FAQ abre, fecha e troca de item por mouse, toque e teclado.
- Nenhum overflow horizontal ou sobreposicao incoerente em mobile e desktop.
- `typecheck`, lint, testes relevantes e build de producao passam.

## Criterio de aceite

A landing deve ganhar um momento de marca perceptivel, mas continuar parecendo
rapida. O FAQ deve responder ao toque de forma suave e precisa. Nenhuma animacao
pode atrasar navegacao, esconder informacao necessaria ou reaparecer de forma
repetitiva durante a mesma sessao.
