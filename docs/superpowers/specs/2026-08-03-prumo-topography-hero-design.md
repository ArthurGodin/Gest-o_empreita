# Hero topografico hibrido do Prumo

**Data:** 03/08/2026  
**Status:** direcao aprovada para implementacao

## Objetivo

Dar identidade propria a landing do Prumo com uma topografia tridimensional
ligada a arquitetura, engenharia e obra, sem sacrificar legibilidade,
conversao ou desempenho em celulares. O primeiro viewport deve continuar
mostrando o produto real, a proposta de valor e os dois caminhos comerciais:
cadastro e precos.

## Escopo

- Refinar somente o header e o primeiro bloco da landing.
- Manter os textos, destinos dos CTAs e eventos de analytics atuais.
- Usar a cena Three/TSL apenas em desktop capaz de executa-la com folga.
- Entregar uma composicao estatica equivalente em mobile e dispositivos sem
  suporte.
- Preservar tema, cadastro, login, planos, Supabase, Asaas e demais fluxos.

Nao fazem parte deste lote: 3D dentro do app autenticado, alteracao de planos,
novos eventos comerciais, mudancas de checkout ou uma reformulacao das secoes
posteriores da landing.

## Direcao visual

O header e o hero usam um fundo verde quase preto, com texto branco e acentos
esmeralda. A topografia aparece como uma superficie tecnica de curvas de nivel,
nao como objeto decorativo generico.

### Desktop, a partir de 1024 px

- Texto, CTAs, fatos de confianca e captura do produto ocupam a metade esquerda.
- A cena 3D ocupa a metade direita, sem atravessar texto ou controles.
- A captura do dashboard permanece visivel no primeiro viewport e nao fica
  escondida pela topografia.
- O hero termina cedo o bastante para revelar conteudo reconhecivel da proxima
  secao em 1366 x 768 e 1440 x 900.
- Movimento de ponteiro e varredura luminosa sao lentos e sutis.

### Mobile e tablet vertical, abaixo de 1024 px

- Nenhum modulo Three.js e solicitado pelo navegador.
- Titulo, descricao, CTAs e fatos permanecem sobre fundo limpo.
- A imagem topografica estatica fica restrita a uma zona visual inferior,
  atras da captura do produto, sem tocar no texto ou nos botoes.
- A captura do dashboard continua no primeiro viewport em 390 x 844. Em telas
  muito baixas, a composicao reduz a imagem sem ocultar CTA ou informacao.
- Nao existe movimento automatico da topografia.

## Carregamento e compatibilidade

O componente cliente decide se pode carregar a cena antes de montar o import
dinamico. Todos os criterios abaixo precisam ser verdadeiros:

1. viewport com pelo menos 1024 px de largura;
2. WebGL2 disponivel sem alerta de desempenho grave;
3. preferencia `prefers-reduced-motion` desativada;
4. `Save-Data` nao ativado;
5. conexao nao classificada como `slow-2g` ou `2g`;
6. mais de 2 nucleos logicos e mais de 2 GB de memoria, quando informados.

Se qualquer criterio falhar, fica somente a imagem estatica. Falha de
inicializacao ou renderizacao grafica tambem cai silenciosamente no fallback,
sem remover conteudo e sem gerar erro para o usuario.

O `IntersectionObserver` pausa o loop quando o hero sai da vizinhanca do
viewport. O DPR fica limitado para evitar custo desnecessario em telas densas.

## Acessibilidade e interacao

- Cena e imagem decorativa usam `aria-hidden` e texto alternativo vazio.
- Nenhum canvas entra na ordem de foco.
- Os CTAs mantem foco visivel, rotulos e areas de toque atuais.
- `prefers-reduced-motion` impede o carregamento da animacao, em vez de apenas
  congelar uma cena ja baixada.
- Texto nunca usa a cena como unico fundo de contraste.
- A troca de tema continua funcional; o hero de marca permanece escuro em
  ambos os temas para manter a composicao previsivel.

## Orcamento de desempenho

- Mobile: o chunk 3D de aproximadamente 1,47 MB descompactado nao pode aparecer
  nas entradas de rede.
- Mobile: nenhum aumento relevante de JavaScript inicial alem do pequeno
  controlador de elegibilidade.
- Imagens do hero devem usar dimensoes responsivas e formatos otimizados.
- A animacao nao pode atrasar a exibicao do titulo, dos CTAs ou da captura do
  produto.
- Nao pode haver rolagem horizontal em nenhum viewport validado.

O desktop pode carregar o chunk 3D depois que o conteudo principal estiver
visivel. A cena nao e requisito para entender ou usar a landing.

## Estados e falhas

| Estado | Resultado |
|---|---|
| JavaScript desativado | Hero completo com imagem estatica |
| Mobile | Composicao estatica sem chunk 3D |
| Movimento reduzido | Composicao estatica sem chunk 3D |
| Economia de dados ou conexao lenta | Composicao estatica sem chunk 3D |
| WebGL2 ausente | Composicao estatica sem erro de console |
| Renderer falha ao iniciar | Error boundary remove apenas o canvas |
| Hero fora do viewport | Loop de renderizacao pausado |

## Validacao

### Automatizada

- `npm run typecheck`
- `npm run lint -- --quiet`
- `npm test -- --run`
- `npm run build`

### Navegador

- Viewports: 320 x 800, 390 x 844, 768 x 1024, 1024 x 768 e 1440 x 900.
- Confirmar texto, CTA, header, produto e inicio da proxima secao sem
  sobreposicao incoerente.
- Confirmar ausencia de overflow horizontal.
- Confirmar que mobile, movimento reduzido e WebGL2 ausente nao carregam o
  chunk 3D.
- Confirmar canvas nao vazio e em movimento no desktop compativel por duas
  capturas e comparacao de pixels.
- Confirmar fallback estatico visivel se o canvas falhar.
- Confirmar troca de tema, navegacao e erros de console.

## Publicacao e rollback

A implementacao entra em um commit isolado. Depois dos gates locais, o commit e
enviado para `main`, o deploy Vercel precisa ficar `Ready` e a landing publica e
revalidada em mobile e desktop. Se houver regressao de legibilidade,
compatibilidade ou LCP, o commit visual pode ser revertido sem tocar nos fluxos
do app.
