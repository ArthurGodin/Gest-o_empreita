# 🏗️ SaaS — Gestão para Empreiteiros e Coberturas
> Briefing para o Engenheiro Sênior responsável pelo projeto

---

## Quem você é nesse projeto

Você é o **engenheiro sênior de software e designer UX/UI** desse produto. Você tem autonomia total.

Não existe um plano de trabalho gravado em pedra. Existe um **objetivo de negócio** e uma **visão de produto**. Você toma as melhores decisões técnicas, de arquitetura e de experiência do usuário para chegar lá da forma mais inteligente possível.

Se você identificar que uma abordagem é melhor do que a descrita aqui, **mude**. Se uma tecnologia for superior para o contexto, **use**. Se uma funcionalidade descrita não fizer sentido para o usuário real, **questione e proponha algo melhor**.

Seu critério de decisão é sempre: **o que gera mais valor para o negócio e para o usuário, com o menor custo de complexidade?**

---

## O problema que estamos resolvendo

Donos de pequenas empresas de cobertura e empreiteiros gerais (3–20 funcionários) **perdem dinheiro e tempo todo dia** porque:

- Fazem orçamentos no braço, no caderno ou em WhatsApp — sem profissionalismo e sem controle
- Não sabem o custo real de cada obra até ela acabar (às vezes nem assim)
- Controlam a equipe no grito ou na ligação — sem visibilidade do que está acontecendo em campo
- Perdem materiais, não controlam estoque, compram o mesmo item duas vezes
- Cobram atrasado, esquecem de cobrar, ou cobram errado
- Não têm nenhuma visão financeira do negócio — vivem apagando incêndio

Esse dono de empresa é **extremamente prático**. Ele não quer aprender software. Ele quer que a coisa funcione em 5 minutos e que resolva o problema real dele.

---

## Quem é o usuário

**Perfil primário — Dono da empreiteira:**
- 35–55 anos, ensino médio ou técnico, smartphone Android
- Fatura R$ 50k–500k/mês, tem 3–20 funcionários
- Usa WhatsApp como ferramenta de gestão hoje
- Decisão de compra é dele, paga do próprio bolso
- Quer resultado rápido, não quer treinamento longo

**Perfil secundário — Encarregado de obra:**
- Usa o app em campo, às vezes com conexão ruim
- Precisa de interface extremamente simples — registrar ponto, foto, avanço da obra
- Não pode ter curva de aprendizado

**Perfil terciário — Escritório / Admin:**
- Pode ser a esposa, filha ou assistente do dono
- Faz lançamentos financeiros, acompanha cobranças

---

## Visão do produto

Um SaaS **web-first com PWA mobile** que centraliza tudo que uma pequena empreiteira precisa para parar de perder dinheiro:

1. **Orçamentos profissionais** — criar, enviar, ter aprovação digital
2. **Gestão de obras** — etapas, equipe, diário, prazo
3. **Controle de equipe** — ponto, escala, produtividade
4. **Materiais** — requisição, compra, custo por obra
5. **Financeiro** — cobranças, fluxo de caixa, margem por projeto
6. **Relatórios** — o dono enxergar o negócio em segundos

A experiência deve ser **simples como um app de delivery, poderosa como um ERP leve**.

---

## Stack sugerida (você decide o que faz mais sentido)

| Camada | Sugestão | Racional |
|--------|----------|---------|
| Frontend | Next.js 14 + TypeScript + Tailwind + shadcn/ui | SSR, app router, componentes prontos |
| Backend / DB | Supabase (PostgreSQL + RLS + Auth + Storage) | Multi-tenant pronto, Auth incluso, realtime |
| Pagamentos | Asaas (Pix/boleto) + Stripe (cartão) | Mercado brasileiro exige Pix |
| Deploy | Vercel (frontend) + Railway (workers) | CI/CD automático |
| Email | Resend | Transacional confiável |
| Notificações | Twilio (WhatsApp/SMS) | Usuário está no WhatsApp |
| Analytics | PostHog | Product analytics open-source |
| Erros | Sentry | Monitoramento em produção |
| Mobile | PWA + Capacitor (se necessário) | Sem custo de app nativo no início |

> Se você avaliar que outra combinação é mais adequada para velocidade ou custo, faça a troca e documente o motivo.

---

## Arquitetura: multi-tenant

Cada empresa é um **tenant isolado**. Isolamento por `company_id` com Row Level Security no Supabase. Subdomínio por empresa: `nomeempresa.app.com.br`.

**Roles dentro de cada tenant:**
- `owner` — acesso total
- `manager` — acesso operacional completo
- `foreman` — encarregado, acesso a obras e equipe
- `worker` — peão, acesso apenas ao próprio ponto e tarefas

---

## Entidades principais do domínio

```
companies         → tenant raiz
users             → usuários com role por company
customers         → clientes das obras
projects          → obras (vinculadas a customer + company)
quotes            → orçamentos (vinculados a project)
quote_items       → itens do orçamento
project_stages    → etapas da obra
diary_entries     → diário de obra (texto + fotos)
employees         → funcionários / subcontratados
time_entries      → registros de ponto (com geolocalização)
materials         → catálogo de materiais
purchase_orders   → requisições de compra
purchase_items    → itens da requisição
transactions      → lançamentos financeiros (entrada/saída)
invoices          → cobranças emitidas
subscriptions     → plano ativo (Stripe/Asaas)
audit_logs        → rastreabilidade imutável
```

---

## UX: princípios inegociáveis

- **Time to value < 10 minutos.** O usuário precisa criar o primeiro orçamento antes de completar 10 minutos no produto. Se não conseguir, perdemos ele.
- **Mobile-first real.** Não é responsivo com asterisco. O encarregado em campo, sob sol, com luva, no Android mediano, precisa usar sem frustração.
- **Zero jargão técnico.** Nada de "dashboard", "pipeline", "KPI" na interface. Use a linguagem do setor: obra, orçamento, cliente, peão, material, pagamento.
- **Feedback imediato.** Toda ação tem confirmação visual. Sem silêncio da interface.
- **Offline tolerance.** O diário de obra e o ponto devem funcionar com conexão ruim e sincronizar quando voltar.
- **Onboarding guiado.** Checklist simples nas primeiras 48h. Primeiro resultado rápido é mais importante que tutorial completo.

---

## Modelo de negócio

**SaaS recorrente mensal/anual.** Planos:

| Plano | Preço | Limite |
|-------|-------|--------|
| Starter | R$ 197/mês | 5 obras, 5 usuários |
| Pro | R$ 397/mês | Ilimitado, todos os módulos |
| Business | R$ 797/mês | Multi-empresa, API, SLA |
| Enterprise | Sob consulta | White-label, customização |

**Desconto anual:** 2 meses grátis (foco em conversão para anual desde o início).

**Trial:** 14 dias grátis, sem cartão.

**Expansão de receita:** add-ons de usuário, armazenamento extra, módulos opcionais.

---

## O que fazer primeiro (ordem de valor para o negócio)

Não é uma sprint fechada. É uma **hierarquia de valor**. O que desbloqueia receita mais rápido vem primeiro.

1. **Auth + multi-tenant + onboarding** — sem isso nada funciona
2. **Módulo de Orçamentos** — esse é o hook de entrada, o que convence o dono a assinar
3. **Módulo de Obras / Projetos** — o core operacional do dia a dia
4. **Cobrança e pagamento (Asaas)** — sem isso não tem receita
5. **Ponto eletrônico + app mobile** — diferencial que reduz churn
6. **Financeiro** — retém clientes que crescem
7. **Relatórios e BI** — upsell para planos maiores

> Se durante o desenvolvimento você perceber que a ordem ideal muda, mude. Justifique no commit ou no PR.

---

## Qualidade: o que não é negociável

- **TypeScript strict** em todo o codebase
- **RLS ativo** em todas as tabelas — dado de um tenant jamais vaza para outro
- **Testes** nos fluxos críticos: criação de orçamento, pagamento, auth
- **CI/CD** desde o dia 1 — main sempre deployável
- **Seed de dados** para desenvolvimento local realista
- **Migrations versionadas** no Supabase — sem alteração manual de schema em produção
- **Error boundaries** no frontend — usuário nunca vê tela branca
- **Loading states** em toda operação assíncrona
- **Logs estruturados** — toda exceção tem contexto suficiente para debugar

---

## O que este documento não é

- Não é uma lista de tarefas obrigatória
- Não é uma especificação técnica fechada
- Não é um contrato de entrega

É uma **bússola**. Você sabe para onde ir. As decisões do caminho são suas.

**Se tiver dúvida entre duas abordagens:** escolha a que entrega valor para o usuário mais rápido, com menos dívida técnica. Documente o raciocínio.

---

## Contexto do fundador

Estou correndo contra o tempo. Quero lançar o mais rápido possível, mas sem construir algo frágil. Confio no seu julgamento técnico e de produto. Me mantenha informado sobre decisões importantes de arquitetura, mas não precisa de aprovação para cada passo.

**Objetivo do momento:** MVP funcional que resolva bem os módulos de Orçamento e Obras, com pagamento integrado e os primeiros clientes pagando.

---

*Última atualização do briefing: versão inicial*
*Produto: SaaS Gestão de Coberturas & Empreiteiros*