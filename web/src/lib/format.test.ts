import { describe, expect, it } from "vitest";
import {
  centsToBRLInput,
  formatDocument,
  formatPhone,
  parseBRLToCents,
  parseQuantity,
  whatsappLink,
} from "./format";

describe("format helpers", () => {
  it("parses BRL user input to integer cents", () => {
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
    expect(parseBRLToCents("8,00")).toBe(800);
    expect(parseBRLToCents("8.00")).toBe(800);
    expect(parseBRLToCents("8")).toBe(800);
  });

  it("rejects empty and negative money values", () => {
    expect(parseBRLToCents("")).toBeNull();
    expect(parseBRLToCents("-8,00")).toBeNull();
  });

  it("formats cents for editable BRL inputs", () => {
    expect(centsToBRLInput(800)).toBe("8,00");
    expect(centsToBRLInput(123456)).toBe("1234,56");
  });

  it("parses Brazilian decimal quantities", () => {
    expect(parseQuantity("1,5")).toBe(1.5);
    expect(parseQuantity("1.5")).toBe(1.5);
    expect(parseQuantity(-1)).toBe(0);
  });

  it("formats Brazilian phone and document values", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatDocument("12345678901")).toBe("123.456.789-01");
    expect(formatDocument("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("builds WhatsApp links only for valid Brazilian numbers", () => {
    expect(whatsappLink("(11) 98765-4321")).toBe(
      "https://wa.me/5511987654321",
    );
    expect(whatsappLink("5511987654321")).toBe("https://wa.me/5511987654321");
    expect(whatsappLink("123")).toBeNull();
  });
});
