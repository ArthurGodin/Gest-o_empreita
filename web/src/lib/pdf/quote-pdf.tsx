import "server-only";
/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image is not an HTML img and has no alt prop. */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { env } from "@/lib/env";

/**
 * SR-#6 (SSRF guard): só permitimos URLs de logo apontando pro Supabase
 * Storage. Se algum dia alguém escrever um URL externo em companies.logo_url
 * (via DBA, futuro feature, etc), react-pdf NÃO vai fazer SSRF disso.
 */
function safeLogoUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const allowedHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
    if (u.host !== allowedHost) return null;
    if (!u.pathname.startsWith("/storage/v1/object/public/company-logos/")) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Template PDF do orçamento.
 *
 * Layout A4 retrato, paleta neutra (branco/cinza/laranja) compatível com
 * impressão preto-e-branco. Toda a tipografia usa fontes default do
 * react-pdf (Helvetica) pra não precisar de @font-face setup.
 */

interface QuotePdfProps {
  company: {
    name: string;
    legal_name: string | null;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  customer: {
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  quote: {
    number: string;
    title: string;
    description: string | null;
    valid_until: string | null;
    notes: string | null;
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    created_at: string;
  };
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
  }>;
}

const ORANGE = "#f97316";
const TEXT = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG = "#fafafa";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: TEXT,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  logoFallback: {
    width: 56,
    height: 56,
    backgroundColor: ORANGE,
    color: "white",
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 18,
    borderRadius: 6,
  },
  companyBlock: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  companyInfo: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
  },
  companyMeta: {
    color: MUTED,
    fontSize: 9,
    marginTop: 2,
  },
  numberBlock: {
    textAlign: "right",
  },
  numberLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  numberValue: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "Courier",
    marginTop: 2,
  },
  dateLine: {
    fontSize: 8,
    color: MUTED,
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  description: {
    color: MUTED,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  customerCard: {
    backgroundColor: BG,
    padding: 10,
    borderRadius: 6,
  },
  customerName: {
    fontSize: 11,
    fontWeight: 700,
  },
  customerMeta: {
    color: MUTED,
    fontSize: 9,
    marginTop: 2,
  },
  itemsHeader: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: BG,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  itemDescCol: { flex: 1, paddingRight: 8 },
  itemQtyCol: { width: 50, textAlign: "right" },
  itemUnitCol: { width: 40, textAlign: "center" },
  itemPriceCol: { width: 70, textAlign: "right" },
  itemTotalCol: { width: 70, textAlign: "right", fontWeight: 700 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalLabel: {
    fontSize: 10,
    color: MUTED,
    marginRight: 16,
    alignSelf: "center",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 700,
    color: ORANGE,
  },
  validityCard: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: 8,
    borderRadius: 4,
    fontSize: 9,
    textAlign: "center",
    marginBottom: 12,
  },
  notesCard: {
    backgroundColor: BG,
    padding: 10,
    borderRadius: 6,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
});

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function QuotePdf({ company, customer, quote, items }: QuotePdfProps) {
  return (
    <Document
      title={`${quote.number} — ${quote.title}`}
      author={company.name}
      subject={`Orçamento ${quote.number}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header: logo + dados da empresa | número do orçamento */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            {(() => {
              const url = safeLogoUrl(company.logo_url);
              return url ? (
                <Image style={styles.logo} src={url} />
              ) : (
                <Text style={styles.logoFallback}>
                  {company.name.slice(0, 2).toUpperCase()}
                </Text>
              );
            })()}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              {company.cnpj && (
                <Text style={styles.companyMeta}>CNPJ: {company.cnpj}</Text>
              )}
              {company.phone && (
                <Text style={styles.companyMeta}>Tel: {company.phone}</Text>
              )}
              {(company.city || company.state) && (
                <Text style={styles.companyMeta}>
                  {[company.city, company.state].filter(Boolean).join("/")}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.numberBlock}>
            <Text style={styles.numberLabel}>Orçamento</Text>
            <Text style={styles.numberValue}>{quote.number}</Text>
            <Text style={styles.dateLine}>
              Emitido em {formatDateBR(quote.created_at)}
            </Text>
          </View>
        </View>

        {/* Título + descrição */}
        <Text style={styles.title}>{quote.title}</Text>
        {quote.description && (
          <Text style={styles.description}>{quote.description}</Text>
        )}

        {/* Validade (warning amarelo) */}
        {quote.valid_until && (
          <Text style={styles.validityCard}>
            Válido até {formatDateBR(quote.valid_until)}
          </Text>
        )}

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Para</Text>
          <View style={styles.customerCard}>
            <Text style={styles.customerName}>{customer.name}</Text>
            {customer.document && (
              <Text style={styles.customerMeta}>CPF/CNPJ: {customer.document}</Text>
            )}
            {customer.phone && (
              <Text style={styles.customerMeta}>Tel: {customer.phone}</Text>
            )}
            {customer.email && (
              <Text style={styles.customerMeta}>{customer.email}</Text>
            )}
            {(customer.city || customer.state) && (
              <Text style={styles.customerMeta}>
                {[customer.city, customer.state].filter(Boolean).join("/")}
              </Text>
            )}
            {customer.address && (
              <Text style={styles.customerMeta}>{customer.address}</Text>
            )}
          </View>
        </View>

        {/* Itens */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens</Text>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemDescCol}>Descrição</Text>
            <Text style={styles.itemQtyCol}>Qtd</Text>
            <Text style={styles.itemUnitCol}>Un.</Text>
            <Text style={styles.itemPriceCol}>Preço</Text>
            <Text style={styles.itemTotalCol}>Total</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemDescCol}>{item.description}</Text>
              <Text style={styles.itemQtyCol}>{item.quantity}</Text>
              <Text style={styles.itemUnitCol}>{item.unit}</Text>
              <Text style={styles.itemPriceCol}>
                {formatBRL(item.unit_price_cents)}
              </Text>
              <Text style={styles.itemTotalCol}>
                {formatBRL(item.total_cents)}
              </Text>
            </View>
          ))}

          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatBRL(quote.total_cents)}</Text>
          </View>
        </View>

        {/* Observações */}
        {quote.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.notesCard}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          {company.name}
          {quote.valid_until ? ` · Válido até ${formatDateBR(quote.valid_until)}` : ""}
          {" · Gerado por Gestão Empreita"}
        </Text>
      </Page>
    </Document>
  );
}
