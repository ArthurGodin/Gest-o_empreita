# Guia Definitivo de Deploy - Gestão Empreita (Vercel)

Para colocar a Gestão Empreita no ar, você precisará preencher as variáveis abaixo no painel da **Vercel** (`Settings > Environment Variables`).

## Variáveis Obrigatórias (Copie e Cole na Vercel)

### 1. Supabase (Banco de Dados e Auth)
*Vá em: Seu Projeto no Supabase > Project Settings > API*

*   `NEXT_PUBLIC_SUPABASE_URL` = Sua URL do projeto (Ex: `https://abcd.supabase.co`)
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Sua chave pública (`anon`, `public`)
*   `SUPABASE_SERVICE_ROLE_KEY` = Sua chave secreta (`service_role`, `secret`). **NUNCA compartilhe esta chave.**

### 2. Informações Base do App
*   `NEXT_PUBLIC_APP_URL` = A URL final do seu projeto em produção (Ex: `https://www.gestaoempreita.com.br` ou `https://seu-projeto.vercel.app`)

### 3. Asaas (Faturamento SaaS Real)
*Vá em: Sua conta Asaas > Configurações > Integrações > Chaves de API*

*   `ASAAS_API_KEY` = A sua chave de produção que começa com `$aact_...`
*   `ASAAS_API_URL` = Use a URL de produção: `https://api.asaas.com/v3`
*   `ASAAS_WEBHOOK_TOKEN` = Crie uma senha forte e longa (ex: `GestaoEmpreita2026SuperSecretWebhook!`)
    *   *Ação no Asaas:* No painel do Asaas, vá em Webhooks > Novo Webhook. A URL do webhook será `https://sua-url.com.br/api/webhooks/asaas`. Cole o mesmo token criado acima lá e marque os eventos (Cobranças: Recebida, Atrasada, Estornada, etc).

### 4. Emails Transacionais (Resend) - *Opcional*
*Se quiser que os emails saiam com seu domínio próprio*

*   `RESEND_API_KEY` = Chave da API do Resend (Ex: `re_12345...`)
*   `EMAIL_FROM` = O remetente oficial (Ex: `Gestão Empreita <contato@gestaoempreita.com.br>`)

---

## 🚀 Como Fazer o Deploy Agora Mesmo (Passo a Passo)

1.  Acesse o site da **Vercel** (https://vercel.com) e faça login (com seu GitHub).
2.  Clique em **"Add New Project"** e importe o repositório `ArthurGodin/Gest-o_empreita`.
3.  No campo "Framework Preset", certifique-se de que `Next.js` está selecionado.
4.  No campo "Root Directory", clique em "Edit" e selecione a pasta `web` (já que o projeto não está na raiz do repositório).
5.  Abra a seção **"Environment Variables"**.
6.  Copie e cole as variáveis listadas acima (as da seção Supabase são urgentes para o sistema funcionar).
7.  Clique em **"Deploy"**.

Pronto! Em 3 minutos a Vercel vai te dar o link oficial. Se as variáveis estiverem lá, o banco de dados conecta, o auth funciona e a página de login sobe redonda!
