export const HELP_CATEGORIES = [
  { id: "getting-started", label: "Primeiros passos" },
  { id: "customers", label: "Clientes" },
  { id: "quotes", label: "Orçamentos" },
  { id: "approvals", label: "Aprovação" },
  { id: "projects", label: "Obras" },
  { id: "billing", label: "Cobranças" },
  { id: "plans", label: "Planos e conta" },
  { id: "security", label: "Segurança" },
] as const;

export type HelpCategoryId = (typeof HELP_CATEGORIES)[number]["id"];

export interface HelpTopic {
  id: string;
  category: HelpCategoryId;
  question: string;
  answer: string;
  steps?: readonly string[];
  keywords: readonly string[];
  action?: {
    label: string;
    href: string;
  };
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "primeiros-passos",
    category: "getting-started",
    question: "Por onde começo no Prumo?",
    answer:
      "Comece cadastrando um cliente e monte o primeiro orçamento. Depois envie o link para aprovação, transforme o aprovado em obra e configure a cobrança.",
    steps: [
      "Cadastre o cliente.",
      "Crie e envie um orçamento com valor.",
      "Acompanhe a aprovação e transforme a proposta em obra.",
    ],
    keywords: ["começar", "inicio", "onboarding", "primeira venda"],
    action: { label: "Abrir início", href: "/app" },
  },
  {
    id: "dados-da-empresa",
    category: "getting-started",
    question: "Onde altero os dados da minha empresa?",
    answer:
      "Abra Configurações para revisar nome, contato, endereço, logotipo e forma de recebimento. Esses dados podem aparecer nas propostas enviadas ao cliente.",
    keywords: ["empresa", "logo", "whatsapp", "endereço", "configuração"],
    action: { label: "Abrir configurações", href: "/app/configuracoes" },
  },
  {
    id: "cadastrar-cliente",
    category: "customers",
    question: "Como cadastro ou edito um cliente?",
    answer:
      "Em Clientes, use Novo cliente. Para corrigir um cadastro existente, abra o cliente, altere os campos necessários e salve antes de sair.",
    keywords: ["cliente", "cadastro", "editar", "telefone", "email"],
    action: { label: "Abrir clientes", href: "/app/clientes" },
  },
  {
    id: "documento-do-cliente",
    category: "customers",
    question: "Quando o CPF ou CNPJ do cliente é necessário?",
    answer:
      "O documento é usado quando uma cobrança automática precisa ser emitida pelo Asaas. Você pode cadastrar o cliente antes e preencher o documento quando for cobrar.",
    keywords: ["cpf", "cnpj", "documento", "asaas", "cobrar"],
  },
  {
    id: "criar-orcamento",
    category: "quotes",
    question: "Como crio um orçamento completo?",
    answer:
      "Escolha o cliente, dê um título claro e adicione serviços ou materiais com quantidade, unidade e preço. Revise o total, a validade e as observações antes de enviar.",
    keywords: ["orçamento", "proposta", "item", "preço", "validade"],
    action: { label: "Novo orçamento", href: "/app/orcamentos/novo" },
  },
  {
    id: "usar-sinapi",
    category: "quotes",
    question: "Como uso a base SINAPI no orçamento?",
    answer:
      "No Plano Ultimate, pesquise composições e insumos oficiais por UF dentro do editor. Ao adicionar um resultado, o Prumo guarda a referência usada no orçamento; revise quantidade e preço antes de enviar.",
    keywords: ["sinapi", "caixa", "composição", "insumo", "uf", "ultimate"],
    action: { label: "Abrir orçamentos", href: "/app/orcamentos" },
  },
  {
    id: "salvar-e-enviar-orcamento",
    category: "quotes",
    question: "Como salvo, gero o PDF e envio pelo WhatsApp?",
    answer:
      "Salve as alterações no editor e use a ação de envio. O Prumo prepara o link público e a mensagem para o WhatsApp. O PDF também fica disponível no orçamento.",
    keywords: ["salvar", "pdf", "whatsapp", "enviar", "link"],
    action: { label: "Abrir orçamentos", href: "/app/orcamentos" },
  },
  {
    id: "aprovar-orcamento",
    category: "approvals",
    question: "Como o cliente aprova ou recusa a proposta?",
    answer:
      "O cliente abre o link público sem criar conta, revisa a proposta e registra aprovação ou pedido de revisão. A decisão aparece no orçamento dentro do painel.",
    keywords: ["aprovar", "recusar", "revisão", "aceite", "cliente"],
  },
  {
    id: "link-de-orcamento-invalido",
    category: "approvals",
    question: "O link do orçamento ficou inválido. O que faço?",
    answer:
      "Abra o orçamento no painel e gere ou copie o link mais recente. Links substituídos ou revogados deixam de abrir para proteger a proposta antiga.",
    keywords: ["link", "inválido", "revogar", "token", "reenviar"],
    action: { label: "Abrir orçamentos", href: "/app/orcamentos" },
  },
  {
    id: "transformar-em-obra",
    category: "projects",
    question: "Como transformo um orçamento aprovado em obra?",
    answer:
      "Abra o orçamento aprovado, use Virar obra e confirme a entrada combinada. O Prumo cria a obra com o valor da proposta e prepara entrada e saldo para acompanhamento.",
    keywords: ["obra", "converter", "virar obra", "aprovado", "entrada"],
    action: { label: "Abrir obras", href: "/app/obras" },
  },
  {
    id: "acompanhar-obra",
    category: "projects",
    question: "O que consigo acompanhar dentro da obra?",
    answer:
      "A obra reúne etapas, diário com fotos, custos, horas da equipe, cobranças e andamento público. Use cada seção para manter execução e margem no mesmo lugar.",
    keywords: ["etapas", "diário", "foto", "custo", "equipe", "margem"],
    action: { label: "Abrir obras", href: "/app/obras" },
  },
  {
    id: "cobrar-entrada-e-saldo",
    category: "billing",
    question: "Como cobro entrada e saldo da obra?",
    answer:
      "Na seção de cobrança da obra, gere o Pix da entrada e envie ao cliente. O saldo fica disponível conforme o andamento e a confirmação da entrega.",
    keywords: ["pix", "entrada", "saldo", "cobrança", "receber"],
    action: { label: "Abrir obras", href: "/app/obras" },
  },
  {
    id: "pix-manual-ou-asaas",
    category: "billing",
    question: "Qual a diferença entre Pix manual e Asaas?",
    answer:
      "No Pix manual, o cliente paga na sua chave e você confirma o recebimento depois de conferir o extrato. No Asaas, a baixa chega automaticamente quando o provedor confirma o pagamento.",
    keywords: ["pix", "manual", "asaas", "automático", "extrato"],
    action: { label: "Configurar recebimento", href: "/app/configuracoes" },
  },
  {
    id: "limites-dos-planos",
    category: "plans",
    question: "O que muda entre Grátis, Pro e Ultimate?",
    answer:
      "O Grátis permite até 3 orçamentos por mês e 1 obra simultânea. O Pro remove esses limites e a marca Prumo dos documentos públicos. O Ultimate acrescenta SINAPI, importação CSV de catálogo e exportação CSV financeira.",
    keywords: ["grátis", "pro", "ultimate", "limite", "preço", "csv"],
    action: { label: "Comparar planos", href: "/precos" },
  },
  {
    id: "cancelar-assinatura",
    category: "plans",
    question: "Como cancelo uma assinatura paga?",
    answer:
      "O proprietário da empresa pode abrir Planos e assinatura dentro de Configurações e cancelar a recorrência. A conta retorna ao Plano Grátis conforme a política exibida na confirmação.",
    keywords: ["cancelar", "assinatura", "plano", "recorrência", "asaas"],
    action: {
      label: "Abrir planos",
      href: "/app/configuracoes/plano",
    },
  },
  {
    id: "recuperar-senha",
    category: "security",
    question: "Esqueci minha senha. Como recupero o acesso?",
    answer:
      "Na tela de login, use Esqueci a senha e informe o e-mail da conta. Abra somente o link recebido no seu e-mail e defina uma nova senha.",
    keywords: ["senha", "login", "acesso", "recuperar", "email"],
    action: { label: "Recuperar senha", href: "/forgot-password" },
  },
  {
    id: "proteger-dados",
    category: "security",
    question: "Que dados nunca devo enviar ao suporte?",
    answer:
      "Nunca envie senha, número completo de cartão, cookies, chave secreta ou link público com token. Para documentos pessoais, explique o problema sem mandar o número completo.",
    keywords: ["segurança", "privacidade", "senha", "cartão", "cpf", "token"],
    action: { label: "Ver privacidade", href: "/privacidade" },
  },
] as const;

export type HelpCategoryFilter = HelpCategoryId | "all";

export function isHelpCategoryId(value: unknown): value is HelpCategoryId {
  return HELP_CATEGORIES.some((category) => category.id === value);
}

export function getHelpCategoryLabel(categoryId: HelpCategoryId) {
  return HELP_CATEGORIES.find((category) => category.id === categoryId)?.label ?? "Ajuda";
}

export function findHelpTopic(topicId: unknown): HelpTopic | null {
  if (typeof topicId !== "string") return null;
  return HELP_TOPICS.find((topic) => topic.id === topicId) ?? null;
}

export function normalizeHelpSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function searchHelpTopics(
  query: string,
  category: HelpCategoryFilter = "all",
) {
  const normalizedQuery = normalizeHelpSearch(query);

  return HELP_TOPICS.filter((topic) => {
    if (category !== "all" && topic.category !== category) return false;
    if (!normalizedQuery) return true;

    const searchable = normalizeHelpSearch(
      [
        getHelpCategoryLabel(topic.category),
        topic.question,
        topic.answer,
        ...topic.keywords,
      ].join(" "),
    );

    return normalizedQuery
      .split(" ")
      .every((term) => searchable.includes(term));
  });
}
