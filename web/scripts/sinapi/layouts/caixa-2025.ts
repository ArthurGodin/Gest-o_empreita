import type {
  SinapiReferenceKind,
  SinapiRegime,
} from "../../../src/lib/sinapi/domain";

interface SinapiSheetLayout {
  sheetName: string;
  kind: SinapiReferenceKind;
  regime: SinapiRegime;
  headerRow: number;
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

export const CAIXA_SINAPI_2025_LAYOUT = {
  id: "caixa-sinapi-xlsx-2025",
  workbookFilePattern: /^SINAPI_Refer.ncia_\d{4}_\d{2}\.xlsx$/,
  competence: {
    sheetName: "Menu",
    row: 2,
    column: 1,
  },
  sheets: [
    {
      sheetName: "ISD",
      kind: "input",
      regime: "sem_desoneracao",
      headerRow: 9,
      dataStartRow: 10,
      stateCodeRow: 9,
      codeColumn: 1,
      descriptionColumn: 2,
      unitColumn: 3,
      metadataColumn: 4,
      firstPriceColumn: 5,
      stateColumnStride: 1,
    },
    {
      sheetName: "ICD",
      kind: "input",
      regime: "com_desoneracao",
      headerRow: 9,
      dataStartRow: 10,
      stateCodeRow: 9,
      codeColumn: 1,
      descriptionColumn: 2,
      unitColumn: 3,
      metadataColumn: 4,
      firstPriceColumn: 5,
      stateColumnStride: 1,
    },
    {
      sheetName: "ISE",
      kind: "input",
      regime: "sem_encargos_sociais",
      headerRow: 9,
      dataStartRow: 10,
      stateCodeRow: 9,
      codeColumn: 1,
      descriptionColumn: 2,
      unitColumn: 3,
      metadataColumn: 4,
      firstPriceColumn: 5,
      stateColumnStride: 1,
    },
    {
      sheetName: "CSD",
      kind: "composition",
      regime: "sem_desoneracao",
      headerRow: 9,
      dataStartRow: 10,
      stateCodeRow: 8,
      groupColumn: 0,
      codeColumn: 1,
      descriptionColumn: 2,
      unitColumn: 3,
      firstPriceColumn: 4,
      stateColumnStride: 2,
      stateMetadataOffset: 1,
    },
    {
      sheetName: "CCD",
      kind: "composition",
      regime: "com_desoneracao",
      headerRow: 9,
      dataStartRow: 10,
      stateCodeRow: 8,
      groupColumn: 0,
      codeColumn: 1,
      descriptionColumn: 2,
      unitColumn: 3,
      firstPriceColumn: 4,
      stateColumnStride: 2,
      stateMetadataOffset: 1,
    },
    {
      sheetName: "CSE",
      kind: "composition",
      regime: "sem_encargos_sociais",
      headerRow: 9,
      dataStartRow: 10,
      stateCodeRow: 8,
      groupColumn: 0,
      codeColumn: 1,
      descriptionColumn: 2,
      unitColumn: 3,
      firstPriceColumn: 4,
      stateColumnStride: 2,
      stateMetadataOffset: 1,
    },
  ] satisfies SinapiSheetLayout[],
  analyticalSheet: {
    sheetName: "Analítico",
    headerRow: 9,
    dataStartRow: 10,
    groupColumn: 0,
    compositionCodeColumn: 1,
    itemTypeColumn: 2,
    itemCodeColumn: 3,
    descriptionColumn: 4,
    unitColumn: 5,
    coefficientColumn: 6,
    statusColumn: 7,
  },
} as const;

export type CaixaSinapi2025Layout = typeof CAIXA_SINAPI_2025_LAYOUT;
