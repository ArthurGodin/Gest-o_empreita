import {
  BRAZIL_STATE_CODES,
  type BrazilStateCode,
  normalizeBrazilStateCode,
} from "../../src/lib/brazil-states";
import {
  normalizeSinapiCode,
  normalizeSinapiCompetence,
  normalizeSinapiDescription,
  normalizeSinapiSearchText,
  normalizeSinapiUnit,
  parseSinapiFractionToBasisPoints,
  parseSinapiMoneyToCents,
  type NormalizedSinapiEntry,
  type SinapiPriceMetadata,
  type SinapiReferenceKind,
  type SinapiRegime,
} from "../../src/lib/sinapi/domain";

export type SinapiCell = string | number | boolean | Date | null;
export type SinapiRow = SinapiCell[];
export type SinapiRowsBySheet = Record<string, SinapiRow[]>;

export interface SinapiSheetLayout {
  sheetName: string;
  kind: SinapiReferenceKind;
  regime: SinapiRegime;
  dataStartRow: number;
  stateCodeRow: number;
  groupColumn?: number;
  codeColumn: number;
  descriptionColumn: number;
  unitColumn: number;
  firstPriceColumn: number;
  stateColumnStride: number;
  metadataColumn?: number;
  stateMetadataOffset?: number;
}

export interface SinapiAnalyticalLayout {
  sheetName: string;
  dataStartRow: number;
  groupColumn: number;
  compositionCodeColumn: number;
  itemTypeColumn: number;
  itemCodeColumn: number;
  descriptionColumn: number;
  unitColumn: number;
  statusColumn: number;
}

export interface SinapiWorkbookLayout {
  id: string;
  competence: {
    sheetName: string;
    row: number;
    column: number;
  };
  sheets: readonly SinapiSheetLayout[];
  analyticalSheet: SinapiAnalyticalLayout;
}

export interface SinapiAnalyticalCompositionHeader {
  rowNumber: number;
  group: string | null;
  code: string;
  description: string;
  unit: string;
  status: string | null;
}

export interface SinapiParseSummary {
  rowCount: number;
  pricedRowCount: number;
  countsByKindRegime: Record<string, number>;
  pricedCountsByKindRegime: Record<string, number>;
  coverageByState: Record<BrazilStateCode, number>;
  maxDescriptionLength: number;
  omittedMissingCompositionPrices: number;
  analyticalCompositionCount: number;
}

export interface SinapiParseResult {
  competence: string;
  layoutId: string;
  entries: NormalizedSinapiEntry[];
  summary: SinapiParseSummary;
}

interface StateColumn {
  state: BrazilStateCode;
  priceColumn: number;
  metadataColumn: number | null;
}

export function parseSinapiWorkbookRows(
  rowsBySheet: SinapiRowsBySheet,
  layout: SinapiWorkbookLayout,
): SinapiParseResult {
  const competence = resolveCompetence(rowsBySheet, layout);
  if (!competence) {
    throw new Error("SINAPI competence not found in workbook");
  }

  const analyticalHeaders = parseAnalyticalCompositionHeaders(
    getSheetRows(rowsBySheet, layout.analyticalSheet.sheetName),
    layout.analyticalSheet,
  );
  if (analyticalHeaders.length === 0) {
    throw new Error("SINAPI analytical sheet has no composition headers");
  }

  const entries: NormalizedSinapiEntry[] = [];
  let omittedMissingCompositionPrices = 0;

  for (const sheetLayout of layout.sheets) {
    const rows = getSheetRows(rowsBySheet, sheetLayout.sheetName);
    const stateColumns = resolveStateColumns(rows, sheetLayout);
    const sheetEntries =
      sheetLayout.kind === "composition"
        ? parseCompositionRows(rows, sheetLayout, stateColumns, analyticalHeaders)
        : parseInputRows(rows, sheetLayout, stateColumns);

    omittedMissingCompositionPrices += sheetEntries.omittedMissingPrices;
    entries.push(...sheetEntries.entries);
  }

  assertNoDuplicateEntries(entries);

  return {
    competence,
    layoutId: layout.id,
    entries,
    summary: buildSummary(entries, {
      omittedMissingCompositionPrices,
      analyticalCompositionCount: analyticalHeaders.length,
    }),
  };
}

export function parseAnalyticalCompositionHeaders(
  rows: SinapiRow[],
  layout: SinapiAnalyticalLayout,
): SinapiAnalyticalCompositionHeader[] {
  const headers: SinapiAnalyticalCompositionHeader[] = [];

  for (let rowIndex = layout.dataStartRow; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row || isBlankRow(row)) continue;

    const itemType = row[layout.itemTypeColumn];
    const itemCode = row[layout.itemCodeColumn];
    if (!isBlank(itemType) || !isBlank(itemCode)) continue;

    const code = normalizeSinapiCode(row[layout.compositionCodeColumn]);
    const description = normalizeSinapiDescription(row[layout.descriptionColumn]);
    const unit = normalizeSinapiUnit(row[layout.unitColumn]);
    if (!code || !description || !unit) {
      throw new Error(
        `Invalid analytical composition header at row ${rowIndex + 1}`,
      );
    }

    headers.push({
      rowNumber: rowIndex + 1,
      group: normalizeNullableText(row[layout.groupColumn]),
      code,
      description,
      unit,
      status: normalizeNullableText(row[layout.statusColumn]),
    });
  }

  return headers;
}

function parseInputRows(
  rows: SinapiRow[],
  layout: SinapiSheetLayout,
  stateColumns: StateColumn[],
): { entries: NormalizedSinapiEntry[]; omittedMissingPrices: number } {
  const entries: NormalizedSinapiEntry[] = [];

  for (let rowIndex = layout.dataStartRow; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row || isBlankRow(row)) continue;

    const code = normalizeSinapiCode(row[layout.codeColumn]);
    const description = normalizeSinapiDescription(row[layout.descriptionColumn]);
    const unit = normalizeSinapiUnit(row[layout.unitColumn]);
    if (!code || !description || !unit) {
      throw new Error(`Invalid SINAPI input row at ${layout.sheetName}:${rowIndex + 1}`);
    }

    const parsedPrices = parsePrices(row, stateColumns, layout, rowIndex);
    entries.push({
      kind: layout.kind,
      code,
      description,
      unit,
      regime: layout.regime,
      prices_cents: parsedPrices.prices_cents,
      price_metadata: parsedPrices.price_metadata,
      search_text: normalizeSinapiSearchText(description),
    });
  }

  return { entries, omittedMissingPrices: 0 };
}

function parseCompositionRows(
  rows: SinapiRow[],
  layout: SinapiSheetLayout,
  stateColumns: StateColumn[],
  analyticalHeaders: SinapiAnalyticalCompositionHeader[],
): { entries: NormalizedSinapiEntry[]; omittedMissingPrices: number } {
  const entries: NormalizedSinapiEntry[] = [];
  let headerIndex = 0;
  let omittedMissingPrices = 0;

  for (let rowIndex = layout.dataStartRow; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row || isBlankRow(row)) continue;

    const analytical = analyticalHeaders[headerIndex];
    if (!analytical) {
      throw new Error(
        `${layout.sheetName} has more composition rows than analytical headers`,
      );
    }
    headerIndex++;

    const description = normalizeSinapiDescription(row[layout.descriptionColumn]);
    const unit = normalizeSinapiUnit(row[layout.unitColumn]);
    if (!description || !unit) {
      throw new Error(
        `Invalid SINAPI composition row at ${layout.sheetName}:${rowIndex + 1}`,
      );
    }

    assertCompositionCrosswalk(layout, row, rowIndex, analytical, description, unit);
    const parsedPrices = parsePrices(row, stateColumns, layout, rowIndex);
    omittedMissingPrices += parsedPrices.omittedMissingCompositionPrices;

    entries.push({
      kind: layout.kind,
      code: analytical.code,
      description,
      unit,
      regime: layout.regime,
      prices_cents: parsedPrices.prices_cents,
      price_metadata: parsedPrices.price_metadata,
      search_text: normalizeSinapiSearchText(description),
    });
  }

  if (headerIndex !== analyticalHeaders.length) {
    throw new Error(
      `${layout.sheetName} has ${headerIndex} composition rows, expected ${analyticalHeaders.length}`,
    );
  }

  return { entries, omittedMissingPrices };
}

function parsePrices(
  row: SinapiRow,
  stateColumns: StateColumn[],
  layout: SinapiSheetLayout,
  rowIndex: number,
): Pick<NormalizedSinapiEntry, "prices_cents" | "price_metadata"> & {
  omittedMissingCompositionPrices: number;
} {
  const prices_cents: NormalizedSinapiEntry["prices_cents"] = {};
  const price_metadata: NormalizedSinapiEntry["price_metadata"] = {};
  let omittedMissingCompositionPrices = 0;
  const rowOrigin =
    layout.kind === "input" && layout.metadataColumn !== undefined
      ? normalizeOrigin(row[layout.metadataColumn], layout.sheetName, rowIndex)
      : null;

  for (const stateColumn of stateColumns) {
    const priceCell = row[stateColumn.priceColumn];
    if (isBlank(priceCell)) continue;

    const priceCents = parseSinapiMoneyToCents(priceCell);
    if (priceCents === null) {
      throw new Error(
        `Invalid SINAPI price at ${layout.sheetName}:${rowIndex + 1}:${stateColumn.state}`,
      );
    }

    const metadata: SinapiPriceMetadata = {};

    if (layout.kind === "composition") {
      const attributionCell =
        stateColumn.metadataColumn === null ? null : row[stateColumn.metadataColumn];
      const attribution = isBlank(attributionCell)
        ? null
        : parseSinapiFractionToBasisPoints(attributionCell);

      if (priceCents === 0 && attribution === null) {
        omittedMissingCompositionPrices++;
        continue;
      }

      if (attribution === null && !isBlank(attributionCell)) {
        throw new Error(
          `Invalid SINAPI attribution at ${layout.sheetName}:${rowIndex + 1}:${stateColumn.state}`,
        );
      }
      if (attribution !== null) {
        metadata.attributed_sp_basis_points = attribution;
      }
    } else if (rowOrigin) {
      metadata.origin = rowOrigin;
    }

    prices_cents[stateColumn.state] = priceCents;
    if (Object.keys(metadata).length > 0) {
      price_metadata[stateColumn.state] = metadata;
    }
  }

  return { prices_cents, price_metadata, omittedMissingCompositionPrices };
}

function resolveStateColumns(
  rows: SinapiRow[],
  layout: SinapiSheetLayout,
): StateColumn[] {
  const stateRow = rows[layout.stateCodeRow];
  if (!stateRow) {
    throw new Error(`${layout.sheetName} is missing state header row`);
  }

  return BRAZIL_STATE_CODES.map((expectedState, index) => {
    const priceColumn = layout.firstPriceColumn + index * layout.stateColumnStride;
    const state = normalizeBrazilStateCode(stateRow[priceColumn]);
    if (state !== expectedState) {
      throw new Error(
        `${layout.sheetName} state column ${priceColumn + 1} expected ${expectedState}`,
      );
    }

    return {
      state,
      priceColumn,
      metadataColumn:
        layout.stateMetadataOffset === undefined
          ? null
          : priceColumn + layout.stateMetadataOffset,
    };
  });
}

function assertCompositionCrosswalk(
  layout: SinapiSheetLayout,
  row: SinapiRow,
  rowIndex: number,
  analytical: SinapiAnalyticalCompositionHeader,
  description: string,
  unit: string,
) {
  const group =
    layout.groupColumn === undefined
      ? null
      : normalizeNullableText(row[layout.groupColumn]);

  if (group !== analytical.group || description !== analytical.description || unit !== analytical.unit) {
    throw new Error(
      `${layout.sheetName}:${rowIndex + 1} does not match analytical composition ${analytical.code}`,
    );
  }
}

function assertNoDuplicateEntries(entries: NormalizedSinapiEntry[]) {
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.regime}:${entry.code}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate SINAPI entry ${key}`);
    }
    seen.add(key);
  }
}

function buildSummary(
  entries: NormalizedSinapiEntry[],
  extra: Pick<
    SinapiParseSummary,
    "omittedMissingCompositionPrices" | "analyticalCompositionCount"
  >,
): SinapiParseSummary {
  const countsByKindRegime: Record<string, number> = {};
  const pricedCountsByKindRegime: Record<string, number> = {};
  const coverageByState = Object.fromEntries(
    BRAZIL_STATE_CODES.map((state) => [state, 0]),
  ) as Record<BrazilStateCode, number>;
  let pricedRowCount = 0;
  let maxDescriptionLength = 0;

  for (const entry of entries) {
    const key = `${entry.kind}:${entry.regime}`;
    countsByKindRegime[key] = (countsByKindRegime[key] ?? 0) + 1;
    maxDescriptionLength = Math.max(maxDescriptionLength, entry.description.length);

    const pricedStates = Object.keys(entry.prices_cents) as BrazilStateCode[];
    if (pricedStates.length > 0) {
      pricedRowCount++;
      pricedCountsByKindRegime[key] = (pricedCountsByKindRegime[key] ?? 0) + 1;
    }
    for (const state of pricedStates) {
      coverageByState[state]++;
    }
  }

  return {
    rowCount: entries.length,
    pricedRowCount,
    countsByKindRegime,
    pricedCountsByKindRegime,
    coverageByState,
    maxDescriptionLength,
    ...extra,
  };
}

function getSheetRows(rowsBySheet: SinapiRowsBySheet, expectedName: string) {
  const direct = rowsBySheet[expectedName];
  if (direct) return direct;

  const expectedKey = normalizeSheetName(expectedName);
  for (const [sheetName, rows] of Object.entries(rowsBySheet)) {
    if (normalizeSheetName(sheetName) === expectedKey) return rows;
  }

  throw new Error(`SINAPI sheet ${expectedName} not found`);
}

function resolveCompetence(
  rowsBySheet: SinapiRowsBySheet,
  layout: SinapiWorkbookLayout,
) {
  const configuredRows = getSheetRows(rowsBySheet, layout.competence.sheetName);
  const configured = normalizeSinapiCompetence(
    configuredRows[layout.competence.row]?.[layout.competence.column],
  );
  if (configured) return configured;

  for (const rows of Object.values(rowsBySheet)) {
    for (const row of rows) {
      for (let column = 0; column < row.length; column++) {
        const cell = row[column];
        if (
          typeof cell === "string" &&
          normalizeSinapiSearchText(cell) === "mes de referencia"
        ) {
          const adjacent = normalizeSinapiCompetence(row[column + 1]);
          if (adjacent) return adjacent;
        }
      }
    }
  }

  return null;
}

function normalizeSheetName(value: string) {
  return normalizeSinapiSearchText(value).replace(/\s+/g, "");
}

function normalizeNullableText(value: SinapiCell | undefined) {
  if (isBlank(value)) return null;
  return String(value).trim().replace(/\s+/g, " ");
}

function normalizeOrigin(
  value: SinapiCell | undefined,
  sheetName: string,
  rowIndex: number,
) {
  const origin = normalizeNullableText(value);
  if (origin === null) return null;
  if (origin.length > 80) {
    throw new Error(`Invalid SINAPI origin at ${sheetName}:${rowIndex + 1}`);
  }
  return origin;
}

function isBlank(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function isBlankRow(row: SinapiRow) {
  return row.every(isBlank);
}
