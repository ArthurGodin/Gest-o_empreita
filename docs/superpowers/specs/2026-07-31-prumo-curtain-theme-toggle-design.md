# Prumo Curtain Theme Toggle

## Objetivo

Substituir o menu aberto pelos botões de aparência por uma alternância direta entre tema claro e escuro, inspirada no componente de referência enviado pelo usuário. A mudança deve preservar a identidade verde e grafite do Prumo, a preferência persistida e o suporte existente ao tema automático.

## Escopo

- Transformar `ThemeIconButton` em um botão circular de alternância direta.
- Usar os ícones `Moon` e `Sun` de `lucide-react`.
- Aplicar uma cortina vertical durante a troca de tema.
- Manter as opções Claro, Escuro e Automático em Configurações e no menu mobile da conta.
- Aplicar o novo botão em todas as superfícies que já usam `ThemeIconButton`.
- Preservar o sistema atual baseado em `next-themes` e `ThemeTransitionProvider`.

Não fazem parte deste trabalho uma nova barra de navegação, as cores bege do componente de referência, busca global, avatar ou uma segunda implementação de estado de tema.

## Interação

O botão mostra uma lua quando a interface está clara e um sol quando está escura. Um clique escolhe explicitamente o tema oposto ao tema atualmente resolvido.

Quando a preferência atual for Automático, o primeiro clique usa o tema efetivamente exibido como referência. Por exemplo: se o sistema estiver escuro, o clique seleciona Claro e salva essa escolha. Automático continua podendo ser reativado em Configurações ou no menu mobile da conta.

Durante a troca:

1. A cortina com a cor de fundo do próximo tema cresce do topo até cobrir a viewport em 450 ms.
2. O `next-themes` recebe a nova preferência quando a tela está coberta.
3. A cortina recolhe para o topo em 450 ms.
4. Cliques adicionais ficam bloqueados até a animação terminar.

O easing será `cubic-bezier(0.76, 0, 0.24, 1)`. Em dispositivos com `prefers-reduced-motion: reduce`, a troca será imediata e sem cortina.

## Aparência do controle

- Formato circular, com 36 px no sidebar e 40 px nos cabeçalhos existentes.
- Cores derivadas dos tokens semânticos do Prumo, sem valores bege ou pretos isolados.
- Borda e foco visível coerentes com os demais botões.
- Escala discreta no hover em dispositivos compatíveis e escala de pressão no clique.
- Ícone central de 16 px, sem texto visível e com tooltip nativo.
- Nenhum menu é aberto pelo botão compartilhado.

## Arquitetura

`ThemeTransitionProvider` continuará como única fonte de verdade para preferência, tema resolvido e estado da animação. O contexto passará a oferecer uma ação de alternância direta, além de `setPreference`, para que o botão não manipule classes do documento nem mantenha estado duplicado.

`ThemeIconButton` consumirá essa ação e renderizará somente o controle circular. `ThemeSettings` e `ThemeMenuSub` continuarão consumindo `setPreference` para oferecer as três opções completas.

A cortina global existente será ajustada para o movimento vertical especificado. Timers serão cancelados no desmontar, e a trava de concorrência continuará impedindo transições sobrepostas. Nenhuma dependência nova será instalada.

## Acessibilidade

- O botão será um `button` nativo acionável por Enter e Espaço.
- O rótulo será dinâmico: `Ativar tema escuro` ou `Ativar tema claro`.
- `aria-pressed` refletirá se o tema resolvido está escuro.
- O foco permanecerá visível em claro e escuro.
- A animação será removida quando o usuário solicitar movimento reduzido.

## Responsividade

O controle não muda a largura dos cabeçalhos nem cria popovers. Ele será validado em 320 px, 375 px e 1440 px. A troca de ícone não poderá alterar dimensões, deslocar links ou gerar rolagem horizontal.

## Validação

- Alternância claro para escuro e escuro para claro.
- Primeiro clique quando a preferência estiver em Automático.
- Persistência após recarregar a página.
- Reativação de Automático em Configurações e no menu mobile.
- Bloqueio de cliques concorrentes.
- Comportamento com movimento reduzido.
- Teclado, foco e rótulos acessíveis.
- QA visual da landing, preços, autenticação, sidebar, menu mobile e Configurações.
- `typecheck`, `lint`, suíte Vitest e build de produção.

## Critério de aceite

O novo botão deve reproduzir a sensação do controle enviado pelo usuário, mas integrado ao design e à arquitetura do Prumo: clique direto, movimento de cortina perceptível, troca persistente, sem menu no botão e sem regressão no modo Automático.
