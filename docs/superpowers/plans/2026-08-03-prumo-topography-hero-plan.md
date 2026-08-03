# Plano de implementacao do hero topografico hibrido

**Especificacao:** `docs/superpowers/specs/2026-08-03-prumo-topography-hero-design.md`

## 1. Elegibilidade testavel

- Criar uma funcao pura para decidir se a cena pode ser carregada.
- Cobrir largura, WebGL2, movimento reduzido, economia de dados, conexao,
  nucleos e memoria em testes unitarios.
- No componente cliente, observar mudancas de viewport, movimento e conexao.
- Adiar o import dinamico ate o navegador ficar ocioso.

## 2. Cena e dependencias

- Manter React Three Fiber, Three Node/TSL em WebGL2 e o fallback por error boundary.
- Substituir `useTexture` e `useAspect` por APIs do Fiber/Three para remover
  `@react-three/drei` e seu grafo de dependencias.
- Pausar o frameloop fora da vizinhanca do viewport e limitar o DPR.

## 3. Composicao responsiva

- Restringir a topografia ao lado direito no desktop.
- Restringir a imagem estatica a zona inferior do hero abaixo de 1024 px.
- Manter texto e controles em uma coluna limpa, sem imagem por tras.
- Reduzir e reposicionar a captura do dashboard para revelar a proxima secao.
- Remover a regra que oculta completamente o produto em telas baixas.

## 4. Gates locais

- Rodar teste unitario da elegibilidade.
- Rodar `typecheck`, lint, suite completa e build.
- Iniciar o build local em porta dedicada.
- Verificar 320, 390, 768, 1024 e 1440 px.
- Medir recursos carregados em mobile e confirmar ausencia do chunk 3D.
- Comparar dois frames desktop para provar canvas nao vazio e em movimento.

## 5. Publicacao

- Commitar somente os arquivos deste lote, preservando alteracoes externas.
- Enviar `main`, aguardar Vercel `Ready` e validar o dominio principal.
- Registrar evidencias em `dogfood-output/prumo-topography-qa-2026-08-03/`.
