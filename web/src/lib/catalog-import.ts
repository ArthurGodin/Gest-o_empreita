import { normalizeQuoteUnit, parseBRLToCents } from "@/lib/format";

export const CATALOG_IMPORT_MAX_ROWS = 500;
export const CATALOG_IMPORT_TEMPLATE =
  "descricao;unidade;preco\n" +
  "Telha ceramica romana;un;8,50\n" +
  "Mao de obra de pedreiro;h;45,00\n" +
  "Manta asfaltica;m2;32,90\n";

export interface CatalogImportRow {
  description: string;
  unit: string;
  default_price_cents: number;
  sourceRow: number;
}

export interface CatalogImportError {
  row: number;
  message: string;
}

export interface CatalogImportParseResult {
  rows: CatalogImportRow[];
  errors: CatalogImportError[];
  ignoredRows: number;
}

type HeaderKey = "description" | "unit" | "price";

const HEADER_ALIASES: Record<HeaderKey, Set<string>> = {
  description: new Set([
    "descricao",
    "description",
    "item",
    "nome",
    "produto",
    "servico",
    "servicos",
  ]),
  unit: new Set(["un", "und", "unidade", "unit", "medida", "unidademedida"]),
  price: new Set([
    "preco",
    "precounitario",
    "valor",
    "valorunitario",
    "unitprice",
    "unitpricecents",
    "defaultprice",
    "defaultpricecents",
  ]),
};

export function parseCatalogCsv(
  rawContent: string,
  options: { maxRows?: number } = {},
): CatalogImportParseResult {
  const maxRows = options.maxRows ?? CATALOG_IMPORT_MAX_ROWS;
  const content = rawContent.replace(/^\uFEFF/, "").trim();

  if (!content) {
    return {
      rows: [],
      errors: [{ row: 1, message: "Arquivo vazio." }],
      ignoredRows: 0,
    };
  }

  const delimiter = detectDelimiter(content);
  const parsedRows = parseDelimitedRows(content, delimiter);
  const [headerRow, ...dataRows] = parsedRows;

  if (!headerRow?.length) {
    return {
      rows: [],
      errors: [{ row: 1, message: "Cabeçalho não encontrado." }],
      ignoredRows: 0,
    };
  }

  const headerMap = mapHeaders(headerRow);
  const missingHeaders = missingRequiredHeaders(headerMap);
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `Cabeçalho obrigatório ausente: ${missingHeaders.join(", ")}.`,
        },
      ],
      ignoredRows: 0,
    };
  }

  const rows: CatalogImportRow[] = [];
  const errors: CatalogImportError[] = [];
  let ignoredRows = 0;

  dataRows.slice(0, maxRows + 1).forEach((row, index) => {
    const sourceRow = index + 2;

    if (row.every((cell) => cell.trim() === "")) {
      ignoredRows += 1;
      return;
    }

    if (rows.length >= maxRows) {
      errors.push({
        row: sourceRow,
        message: `Limite de ${maxRows} itens por importação atingido.`,
      });
      return;
    }

    const description = cellAt(row, headerMap.description).trim();
    const unit = normalizeQuoteUnit(cellAt(row, headerMap.unit).trim() || "un");
    const priceInput = cellAt(row, headerMap.price).trim();

    if (description.length < 2) {
      errors.push({
        row: sourceRow,
        message: "Descrição precisa ter pelo menos 2 caracteres.",
      });
      return;
    }

    const cents = parseBRLToCents(priceInput);
    if (cents == null) {
      errors.push({
        row: sourceRow,
        message: "Preço inválido. Use valores como 8,50 ou R$ 8,50.",
      });
      return;
    }

    rows.push({
      description,
      unit,
      default_price_cents: cents,
      sourceRow,
    });
  });

  return { rows, errors, ignoredRows };
}

function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const candidates = [";", "\t", ","];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: countDelimiterOutsideQuotes(firstLine, delimiter),
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ";";
}

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function parseDelimitedRows(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (char === '"') {
      if (quoted && content[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && content[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function mapHeaders(headerRow: string[]): Partial<Record<HeaderKey, number>> {
  const map: Partial<Record<HeaderKey, number>> = {};

  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    (Object.keys(HEADER_ALIASES) as HeaderKey[]).forEach((key) => {
      if (map[key] === undefined && HEADER_ALIASES[key].has(normalized)) {
        map[key] = index;
      }
    });
  });

  return map;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function missingRequiredHeaders(
  headerMap: Partial<Record<HeaderKey, number>>,
): string[] {
  const missing: string[] = [];
  if (headerMap.description === undefined) missing.push("descricao");
  if (headerMap.price === undefined) missing.push("preco");
  return missing;
}

function cellAt(row: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return row[index] ?? "";
}
