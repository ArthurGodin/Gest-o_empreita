import { describe, expect, it } from "vitest";
import {
  normalizedPaymentSettingsDraft,
  paymentSettingsDraftSignature,
  validatePaymentSettingsDraft,
  type PaymentSettingsDraft,
} from "./payment-settings-draft";

function draft(
  overrides: Partial<PaymentSettingsDraft> = {},
): PaymentSettingsDraft {
  return {
    payment_provider: "manual_pix",
    pix_key_type: "cpf",
    pix_key: "529.982.247-25",
    pix_receiver_name: "Prumo Engenharia",
    pix_receiver_city: "Teresina",
    pix_instructions: "Enviar comprovante",
    ...overrides,
  };
}

describe("payment settings draft", () => {
  it("normalizes a manual Pix key before comparing state", () => {
    expect(normalizedPaymentSettingsDraft(draft())).toMatchObject({
      payment_provider: "manual_pix",
      pix_key_type: "cpf",
      pix_key: "52998224725",
    });
    expect(paymentSettingsDraftSignature(draft())).toBe(
      paymentSettingsDraftSignature(draft({ pix_key: "52998224725" })),
    );
  });

  it("ignores hidden Pix fields while Asaas is selected", () => {
    expect(
      paymentSettingsDraftSignature(
        draft({ payment_provider: "asaas", pix_key: "valor-a" }),
      ),
    ).toBe(
      paymentSettingsDraftSignature(
        draft({ payment_provider: "asaas", pix_key: "valor-b" }),
      ),
    );
  });

  it("validates the manual Pix contract in visual order", () => {
    const validation = validatePaymentSettingsDraft(
      draft({
        pix_key: "123",
        pix_receiver_name: "",
        pix_receiver_city: "",
      }),
    );

    expect(validation.valid).toBe(false);
    expect(validation.firstField).toBe("pix_key");
    expect(validation.errors).toMatchObject({
      pix_key: expect.any(String),
      pix_receiver_name: expect.any(String),
      pix_receiver_city: expect.any(String),
    });
  });

  it("does not require Pix fields for Asaas", () => {
    expect(
      validatePaymentSettingsDraft(
        draft({
          payment_provider: "asaas",
          pix_key: "",
          pix_receiver_name: "",
          pix_receiver_city: "",
        }),
      ).valid,
    ).toBe(true);
  });
});
