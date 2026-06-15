export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

export interface PixBrCodeInput {
  key: string;
  keyType: PixKeyType;
  receiverName: string;
  receiverCity: string;
  amountCents: number;
  txid: string;
  description?: string | null;
}

const PIX_GUI = "br.gov.bcb.pix";
const COUNTRY_CODE = "BR";
const CURRENCY_BRL = "986";
const MCC_GENERIC = "0000";

export function createPixBrCode(input: PixBrCodeInput): string {
  const key = normalizePixKey(input.key, input.keyType);
  if (!key) throw new Error("Chave Pix obrigatória.");
  if (input.amountCents <= 0) throw new Error("Valor do Pix deve ser maior que zero.");

  const receiverName = sanitizeEmvText(input.receiverName, 25);
  const receiverCity = sanitizeEmvText(input.receiverCity, 15);
  if (!receiverName) throw new Error("Nome do recebedor é obrigatório.");
  if (!receiverCity) throw new Error("Cidade do recebedor é obrigatória.");

  const merchantAccountBase =
    buildEmvField("00", PIX_GUI) + buildEmvField("01", key);
  const remainingDescriptionLength = Math.max(
    0,
    99 - merchantAccountBase.length - 4,
  );
  const merchantAccountInfo =
    merchantAccountBase +
    optionalField(
      "02",
      sanitizeEmvText(input.description ?? "", remainingDescriptionLength),
    );

  const additionalData = buildEmvField("05", sanitizeTxid(input.txid));
  const withoutCrc =
    buildEmvField("00", "01")
    + buildEmvField("01", "12")
    + buildEmvField("26", merchantAccountInfo)
    + buildEmvField("52", MCC_GENERIC)
    + buildEmvField("53", CURRENCY_BRL)
    + buildEmvField("54", formatPixAmount(input.amountCents))
    + buildEmvField("58", COUNTRY_CODE)
    + buildEmvField("59", receiverName)
    + buildEmvField("60", receiverCity)
    + buildEmvField("62", additionalData)
    + "6304";

  return `${withoutCrc}${crc16CcittFalse(withoutCrc)}`;
}

export function normalizePixKey(key: string, type: PixKeyType): string {
  const trimmed = key.trim();
  if (!trimmed) return "";

  if (type === "cpf" || type === "cnpj") {
    return onlyDigits(trimmed);
  }

  if (type === "phone") {
    const digits = onlyDigits(trimmed);
    if (!digits) return "";
    return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
  }

  if (type === "email") {
    return trimmed.toLowerCase();
  }

  return trimmed;
}

export function sanitizeEmvText(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

export function sanitizeTxid(value: string): string {
  const txid = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);
  return txid || "***";
}

function formatPixAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

function optionalField(id: string, value: string): string {
  return value ? buildEmvField(id, value) : "";
}

function buildEmvField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  if (length.length > 2) throw new Error(`Campo Pix ${id} excedeu 99 caracteres.`);
  return `${id}${length}${value}`;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function crc16CcittFalse(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}
