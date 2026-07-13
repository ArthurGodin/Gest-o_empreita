# Guia do Prumo para Asafe

Atualizado em: 10/07/2026

Este documento existe para dar contexto rápido ao Asafe sobre o produto, o público, a oferta e o cuidado necessário antes de rodar anúncios pagos.

## 1. O que é o Prumo

O Prumo é um SaaS para pequenas empreiteiras, empresas de cobertura, reformas e prestadores de obra que ainda vendem e controlam tudo por WhatsApp, planilha e memória.

Em uma frase:

> O Prumo ajuda o empreiteiro a criar orçamento profissional, enviar um link para o cliente aprovar e transformar esse orçamento em uma obra controlada pelo celular.

O produto resolve quatro problemas principais:

| Problema do cliente | Como o Prumo ajuda |
| --- | --- |
| Orçamento informal no WhatsApp | Cria orçamento organizado, com itens, valores e PDF |
| Cliente demora para responder | Envia link público para aprovar ou pedir ajuste sem login |
| Obra aprovada vira bagunça | Converte orçamento aprovado em obra com etapas e acompanhamento |
| O dono não sabe se lucrou | Registra custos, cobranças e margem por obra |

## 2. Acesso do Asafe

O Asafe tem uma conta de parceiro interno com plano Ultimate liberado.

Dados fixos da conta:

| Campo | Valor |
| --- | --- |
| URL | `https://gestao-empreita.vercel.app/login` |
| Email | `asafe@prumo.test` |
| Plano | Ultimate |
| Tipo | Conta parceira interna |

A senha deve ser enviada pelo Arthur em canal privado. Não salvar senha em documento público, GitHub, Notion aberto ou grupo.

Observação: esse email é interno para login. Ele não deve ser usado como canal de recuperação de senha. Se o Asafe quiser usar um email real depois, a conta pode ser trocada no Supabase.

## 3. O que o produto faz hoje

Fluxo principal que já pode ser demonstrado:

1. Criar conta e empresa.
2. Cadastrar cliente.
3. Criar orçamento.
4. Adicionar itens, quantidades, preços e observações.
5. Enviar link público do orçamento.
6. Cliente aprova ou pede alteração pelo celular, sem login.
7. Orçamento aprovado vira obra.
8. Obra recebe etapas, diário, fotos, custos e cobranças.
9. Dono acompanha financeiro, cobranças e margem estimada.

Recursos que existem hoje:

| Recurso | Status |
| --- | --- |
| Landing page | Pronta para validar oferta |
| Cadastro e login | Funcionando |
| Plano grátis | Funcionando, com limite |
| Checkout Pro/Ultimate via Asaas | Funcionando quando Asaas está configurado |
| Orçamentos | Funcionando |
| PDF de orçamento | Funcionando |
| Link público de aprovação | Funcionando |
| Aprovação sem login | Funcionando |
| Conversão de orçamento em obra | Funcionando |
| Obras, etapas, custos e diário | Funcionando |
| Fotos no diário de obra | Funcionando |
| Pix por obra | Funcionando via Asaas ou Pix direto configurado |
| Dashboard financeiro | Funcionando |
| Importação de catálogo por CSV | Funcionando no Ultimate |
| Exportação CSV contábil | Funcionando no Ultimate |
| PDF e link público sem marca Prumo | Funcionando no Pro e Ultimate |

## 4. O que ainda não deve ser prometido em anúncio

Esta parte é importante para não gerar venda desalinhada.

Não prometer ainda:

| Promessa | Motivo |
| --- | --- |
| Excel/XLSX nativo | Hoje a importação em lote aceita CSV, não XLSX |
| Base SINAPI integrada | Ainda é recurso futuro |
| Múltiplos usuários com permissões pela interface | Existe base técnica no banco, mas não há fluxo completo self-service |
| Ultimate como produto principal | O Ultimate ainda precisa polir alguns recursos antes de virar oferta principal |

Promessas seguras para anúncio:

| Pode prometer | Observação |
| --- | --- |
| Orçamento profissional pelo celular | Seguro |
| Link para cliente aprovar sem login | Seguro |
| PDF de orçamento | Seguro |
| PDF e link sem marca Prumo no Pro/Ultimate | Seguro |
| Controle de obra após aprovação | Seguro |
| Diário de obra com fotos | Seguro |
| Custos e margem por obra | Seguro |
| Começar grátis | Seguro |
| Plano Pro para vender e controlar melhor | Melhor oferta paga atual |

## 5. Planos comerciais atuais

### Grátis

Para entrada e teste do produto.

O que comunicar:

- Criar primeiros orçamentos.
- Testar link público.
- Validar se o fluxo faz sentido para a empresa.

Pode comunicar "até 3 orçamentos por mês" no plano grátis.

### Pro

Oferta principal para anúncios.

Mensagem recomendada:

> Para quem quer vender com orçamento profissional, organizar a obra e saber se está dando lucro.

O Pro é o melhor plano para vender agora porque entrega o núcleo do produto:

- Orçamentos sem limite.
- Obras sem limite.
- Link público de aprovação.
- PDF.
- Diário de obra.
- Fotos.
- Custos.
- Financeiro.
- Pix/cobranças quando configurado.

### Ultimate

Usar como plano avançado, não como foco de tráfego frio.

Mensagem recomendada:

> Para empresas que já têm catálogo grande e querem estrutura maior.

Enquanto os recursos avançados não estiverem totalmente fechados, tratar Ultimate como expansão, não como promessa central.

## 6. Público ideal para os primeiros anúncios

Priorizar donos que fecham obras de pequeno e médio porte e sentem dor com orçamento/WhatsApp.

Perfis bons:

- Empresas de cobertura.
- Pequenas empreiteiras.
- Reformas residenciais.
- Pintura e acabamento.
- Instalações e manutenção predial.
- Pedreiros/empreiteiros que já têm fluxo de clientes.
- Profissionais que mandam orçamento por WhatsApp ou PDF improvisado.

Sinais de bom cliente:

- Já faz orçamento com frequência.
- Perde venda por falta de apresentação.
- Controla obra por caderno, planilha ou WhatsApp.
- Reclama que não sabe quanto lucrou.
- Quer parecer mais profissional para o cliente final.

Evitar no começo:

- Grandes construtoras.
- Empresas que exigem ERP completo.
- Clientes que precisam de NF, estoque avançado, contabilidade complexa ou gestão pesada de equipe.

## 7. Ângulos de criativo

### Ângulo 1: Orçamento que vende

Ideia:

> Pare de mandar orçamento bagunçado no WhatsApp. Envie um link bonito que o cliente aprova pelo celular.

Bom para criativo mostrando antes/depois:

- Antes: mensagem solta no WhatsApp.
- Depois: orçamento organizado com link, PDF e botão de aprovar.

### Ângulo 2: Profissionalize sem complicar

Ideia:

> Sua empreiteira pode parecer empresa grande sem precisar de sistema complicado.

Bom para dono que quer passar confiança.

### Ângulo 3: Obra aprovada vira controle

Ideia:

> Fechou o orçamento? O Prumo transforma em obra com etapas, fotos, custos e margem.

Bom para quem já perde controle depois que a obra começa.

### Ângulo 4: Margem real

Ideia:

> Não basta faturar. Você precisa saber quanto sobrou em cada obra.

Bom para público mais maduro, que já sente dor financeira.

## 8. Textos base para anúncio

### Texto curto 1

Crie orçamentos profissionais para sua obra, envie um link para o cliente aprovar pelo celular e acompanhe tudo em um só lugar.

Comece grátis no Prumo.

### Texto curto 2

Ainda manda orçamento por WhatsApp e planilha?

Com o Prumo, você cria uma proposta bonita, gera PDF, envia um link e o cliente aprova sem precisar criar conta.

### Texto curto 3

O orçamento foi aprovado? Transforme em obra, acompanhe etapas, registre fotos, lance custos e veja sua margem.

O Prumo foi feito para pequenas empreiteiras que querem vender e controlar melhor.

### Headline

- Orçamento profissional para obras
- Cliente aprova pelo celular
- Controle sua obra sem planilha
- Venda melhor e controle a margem
- O SaaS simples para pequenas empreiteiras

## 9. Funil recomendado

Para começar, não tentar vender caro direto para público frio.

Funil sugerido:

1. Anúncio no Facebook/Instagram.
2. Landing page.
3. Cadastro grátis.
4. Usuário cria primeiro orçamento.
5. Usuário vê valor do Pro quando bater limite ou quiser operar sem restrição.
6. Arthur acompanha os primeiros leads manualmente.

Campanha inicial recomendada:

| Item | Recomendação |
| --- | --- |
| Objetivo | Leads ou conversão em cadastro |
| Orçamento | Baixo no começo, para validação |
| Oferta | Começar grátis |
| Plano foco | Pro |
| Métrica principal | Cadastro qualificado e primeiro orçamento criado |
| Métrica secundária | Checkout iniciado |

## 10. Métricas que importam

No começo, a métrica mais importante não é só clique barato.

Olhar:

| Métrica | Por que importa |
| --- | --- |
| CTR | Diz se o criativo chamou atenção |
| CPC | Mostra custo de tráfego |
| Cadastro iniciado | Mostra intenção |
| Cadastro concluído | Mostra se a landing e signup convencem |
| Onboarding concluído | Mostra se a pessoa criou empresa |
| Primeiro orçamento criado | Sinal forte de ativação |
| Checkout iniciado | Sinal de intenção de pagar |
| Plano pago | Validação real |

## 11. Roteiro de demonstração em 15 minutos

1. Abrir o app.
2. Mostrar dashboard inicial.
3. Ir em Clientes e criar cliente fictício.
4. Criar orçamento.
5. Adicionar 2 ou 3 itens.
6. Mostrar PDF.
7. Mostrar link público.
8. Aprovar como cliente.
9. Voltar para o app e transformar em obra.
10. Mostrar etapas, diário, fotos, custos e financeiro.
11. Fechar com a ideia: "isso substitui planilha, caderno e orçamento informal no WhatsApp".

## 12. Posicionamento recomendado

Não posicionar como ERP completo.

Posicionar como:

> Ferramenta simples e bonita para o dono de pequena empreiteira vender melhor, organizar a obra e enxergar margem.

Frase interna:

> O Prumo não quer ser o sistema mais complexo. Ele quer ser o sistema que o empreiteiro realmente usa pelo celular.

## 13. Cuidados comerciais

Evitar promessas absolutas:

- "Automatiza tudo".
- "Substitui contador".
- "Tem SINAPI integrado".
- "Tem equipe e permissões completas".
- "Funciona igual ERP".

Preferir promessas concretas:

- "Crie orçamento".
- "Envie link".
- "Cliente aprova".
- "Acompanhe obra".
- "Registre custos".
- "Veja margem".

## 14. Próximos ajustes que ajudam anúncios

Antes de escalar verba, priorizar:

1. Criar Pixel no Meta Events Manager e colar as variáveis na Vercel.
2. Validar eventos de cadastro, onboarding e checkout em Test Events.
3. Acompanhar custo por cadastro e custo por onboarding concluído.
4. Melhorar domínio próprio.
5. Criar 1 ou 2 vídeos curtos mostrando o fluxo real do produto.
6. Criar uma página simples de "Como funciona" com prints reais.

## 15. Resumo para o Asafe

O Prumo já pode ser testado em tráfego pago com cuidado.

O foco comercial inicial deve ser:

- Plano grátis como entrada.
- Pro como plano principal.
- Pequenas empreiteiras e profissionais de obra.
- Dor de orçamento informal, WhatsApp, planilha e falta de margem.

Não vender o Ultimate como promessa principal ainda.

O objetivo agora é validar:

1. Se o público entende a dor.
2. Se cadastra.
3. Se cria orçamento.
4. Se vê valor em pagar pelo Pro.
