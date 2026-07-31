# Prumo: dark mode completo e transicao de tema

## Objetivo

Adicionar temas claro, escuro e automatico ao Prumo inteiro, com uma transicao
de cortina curta e reconhecivel. A mudanca deve preservar legibilidade,
conversao, densidade operacional, acessibilidade e todos os fluxos existentes.

O tema sera uma preferencia visual. Nao altera dados, permissoes, planos,
checkout, cobrancas, PDFs ou regras de negocio.

## Direcao visual

O modo escuro sera grafite profundo, e nao uma inversao azulada do tema claro.
Superficies usam diferencas pequenas e consistentes de luminosidade; verde Prumo
continua sendo a cor primaria, e laranja continua reservado para acao comercial.
Cores de sucesso, atencao, erro e informacao mantem seus significados.

O resultado deve continuar operacional e compacto. Nao serao adicionados brilho
excessivo, vidro em todas as superficies, gradientes decorativos, cards maiores ou
efeitos que concorram com o conteudo.

## Preferencia e persistencia

- O projeto usara `next-themes`, que ja esta instalado.
- As opcoes serao Claro, Escuro e Automatico.
- Automatico acompanha `prefers-color-scheme` do dispositivo e sera o padrao para
  quem ainda nao escolheu um tema.
- A escolha sera persistida localmente pelo navegador, sem criar coluna no banco.
- O tema sera aplicado pela classe `dark` no elemento `html` antes da hidratacao,
  evitando flash claro na abertura do app.
- A preferencia deve continuar ativa entre landing, autenticacao, app interno e
  paginas publicas abertas no mesmo navegador.

## Alternador e transicao de cortina

- O recurso enviado sera adaptado ao design system existente; seus estilos inline,
  SVGs proprios e tokens bege nao serao copiados.
- Os icones serao `Sun`, `Moon` e `Monitor` do Lucide.
- O controle completo permitira escolher Claro, Escuro ou Automatico. Em espacos
  compactos, o botao mostra o estado atual e abre um menu acessivel.
- Ao trocar de tema, uma camada da cor do proximo fundo desce, o tema muda quando
  a tela esta coberta e a camada sobe em seguida.
- A transicao completa dura aproximadamente 360 ms, usa apenas `transform` e nao
  bloqueia navegacao por mais tempo que isso.
- Cliques repetidos durante a transicao serao ignorados para evitar estados
  concorrentes.
- Com `prefers-reduced-motion: reduce`, o tema muda imediatamente e a cortina nao
  aparece.
- A camada sera `aria-hidden`, nao recebera foco e nao modificara a ordem de
  leitura.

## Posicionamento do controle

- Landing e precos: cabecalho, proximo das acoes de conta, sem competir com o CTA.
- Login, cadastro e recuperacao: cabecalho ou canto superior consistente.
- Desktop autenticado: rodape da barra lateral, junto das preferencias.
- Mobile autenticado: menu da conta na barra superior.
- Configuracoes: secao Aparencia com as tres opcoes explicitamente rotuladas.
- Paginas publicas do cliente: controle discreto no cabecalho, quando houver
  cabecalho; caso contrario, respeitam Automatico e a escolha ja persistida.

## Arquitetura

### ThemeProvider

Um provider cliente fino sera montado no layout raiz usando `next-themes` com
`attribute="class"`, `defaultTheme="system"`, `enableSystem` e
`disableTransitionOnChange`. A animacao visual sera responsabilidade do controle
Prumo, nao da biblioteca.

### ThemeTransitionProvider

Um provider separado coordenara a cortina, o bloqueio de trocas simultaneas e a
mudanca efetiva de tema. Componentes de alternancia consumirao uma interface
pequena: tema atual, tema resolvido, estado de transicao e funcao de troca.

### Componentes

- `ThemeProvider`: integracao com `next-themes`.
- `ThemeTransitionProvider`: orquestracao da cortina.
- `ThemeMenu`: seletor Claro/Escuro/Automatico.
- `ThemeIconButton`: gatilho compacto e acessivel.
- `ThemeSettings`: controle explicito para Configuracoes.

Cada unidade tera uma responsabilidade unica. Nenhuma tela implementara sua
propria persistencia ou sua propria cortina.

## Migracao visual

A migracao sera feita por familias, mantendo commits reversiveis:

1. Fundacao: tokens globais, providers, primitives de UI, foco, scrollbar,
   overlays, toasts, dialogs e estados de formulario.
2. Superficies publicas: landing, precos, ajuda, termos, privacidade e paginas de
   erro.
3. Autenticacao e onboarding: login, cadastro, recuperacao e primeira entrada.
4. Estrutura autenticada: sidebar, barras mobile, navegacao inferior, cabecalhos,
   dashboard, estados vazios e pendencias.
5. Fluxos operacionais: clientes, propostas/orcamentos, projetos/obras, catalogo,
   financeiro, demonstracao e configuracoes.
6. Fluxos publicos do cliente: proposta, aprovacao, entregas, cobranca e estados
   relacionados.
7. Fechamento: carregamentos, erros, skeletons, menus, modais e componentes pouco
   frequentes encontrados pelo inventario final.

Classes estruturais fixas como `bg-white`, `text-slate-*` e `border-slate-*`
serao substituidas por tokens semanticos sempre que representarem superficie,
texto ou borda. Cores fixas permanecem apenas quando representam marca, estado,
grafico ou documento impresso, sempre com variante escura acessivel na interface.

## Documentos e comunicacoes

PDFs, e-mails e Open Graph continuarao claros e com identidade fixa. Eles sao
artefatos para impressao, compartilhamento e visualizacao fora do navegador; o
tema da interface nao deve alterar sua aparencia nem gerar PDFs escuros.

## Acessibilidade

- Contraste minimo WCAG AA para texto e controles nos dois temas.
- Foco visivel nos dois temas.
- Tema nunca sera comunicado somente por cor; opcoes terao icone e rotulo.
- Alvos de toque com pelo menos 44 px.
- Menus operaveis por teclado e leitores de tela.
- Zoom e preferencias do sistema permanecem respeitados.
- Movimento reduzido elimina cortina, pulsos e transicoes nao essenciais.

## Desempenho e seguranca

- Nenhuma nova dependencia sera adicionada.
- A cortina usa uma unica camada fixa e animacao por `transform`.
- Nao havera leitura de preferencia no servidor nem armazenamento de dado pessoal.
- A aplicacao deve continuar renderizando conteudo utilizavel sem depender da
  animacao.
- Checkout, Asaas, Supabase, analytics e PDFs nao serao alterados.

## Testes e QA

- Typecheck, lint, testes unitarios e build.
- Testes do seletor, persistencia e bloqueio de transicoes simultaneas.
- E2E nos temas Claro, Escuro e Automatico.
- QA visual em 375 px, 768 px e 1440 px para cada familia de telas.
- Verificacao de contraste, foco, menus, modais, toasts, tabelas, graficos, estados
  vazios, loading e erros.
- Verificacao sem overflow horizontal e sem flash de tema na carga.
- QA com movimento reduzido.
- Smoke dos fluxos de login, cadastro, proposta, projeto, financeiro, pagamento e
  paginas publicas.

## Estrategia de entrega

Os lotes serao commitados localmente de forma independente. Como o GitHub dispara
deploy automatico, o push e a publicacao ocorrerao somente depois que todos os
lotes e o QA completo estiverem aprovados. A alteracao local preexistente em
`docs/CHECKLIST_LANCAMENTO.md` permanecera fora dos commits.

## Fora de escopo

- Tema personalizado por empresa.
- Seletor de cor da marca.
- Sincronizar tema entre navegadores pelo banco.
- Alterar o visual de PDFs, e-mails e imagens Open Graph conforme o tema.
- Mudar funcionalidades ou promessas dos planos.

## Criterio de aceite

O trabalho esta concluido quando todas as interfaces do Prumo podem ser usadas em
Claro, Escuro ou Automatico sem superficies erradas, texto ilegivel, flash de
tema, controles ausentes, regressao funcional ou diferenca de recursos entre os
temas; e quando a transicao de cortina acrescenta identidade sem atrasar o uso.
