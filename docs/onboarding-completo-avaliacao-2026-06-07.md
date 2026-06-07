# Avaliação de onboarding completo - Gestão Empreita

Data: 2026-06-07

## Decisão

Não recomendo transformar o onboarding inicial em um fluxo longo agora.

O melhor desenho para vender sem fricção é:

1. Cadastro mínimo: nome da empresa, WhatsApp, cidade e UF.
2. Primeira tela útil: dashboard com checklist "Seu primeiro dinheiro no app".
3. Setup progressivo: pedir dados extras apenas quando eles destravam uma ação real.

## Por quê

O usuário que chegou agora quer descobrir rápido se o produto ajuda a vender e cobrar. Se o app pedir logo marca, endereço, dados fiscais, Pix, equipe, templates, domínio e preferências, a ativação cai antes de ele sentir valor.

Para esse público, onboarding bom não é "preencher perfil". É levar o dono da empreiteira até o primeiro orçamento aprovado e a primeira entrada cobrada.

## O que já foi aplicado

O dashboard recebeu um checklist operacional de primeira venda:

- Cliente
- Orçamento
- Link
- Aprovação
- Entrada

Esse checklist funciona como onboarding contínuo: ele mostra progresso, escolhe a próxima ação e não bloqueia o uso do produto.

## Onboarding completo ideal

Quando houver tração, o onboarding completo deve ser dividido em módulos:

- Empresa: nome, WhatsApp, cidade, UF, logo.
- Venda: primeiro cliente e primeiro orçamento.
- Cobrança: CPF/CNPJ do cliente, Asaas ativo, Pix de entrada.
- Operação: template de etapas, diário de obra, custos.
- Confiança: link público, PDF, email/remetente, domínio.

Cada módulo deve aparecer no momento em que aumenta conversão ou evita erro.

## Próximo incremento recomendado

Depois do Pacote 1, implementar uma tela de "Configuração guiada" dentro de `/app/configuracoes`, não antes do usuário entrar no app.

Ela deve ter health checks:

- Supabase conectado.
- Resend configurado.
- Asaas API configurada.
- Webhook Asaas ativo.
- Pix testado.
- Logo da empresa preenchida.

Isso melhora suporte e confiança sem travar o primeiro uso.
