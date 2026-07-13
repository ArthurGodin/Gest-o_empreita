export interface AsaasCustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  mobilePhone?: string | null;
  externalReference: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
}

export interface AsaasPaymentInput {
  customer: string;
  valueCents: number;
  dueDate: string;
  description: string;
  externalReference: string;
}

export interface AsaasPayment {
  id: string;
  status: string;
  invoiceUrl: string | null;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string | null;
}

export interface AsaasWebhookPayment {
  id?: string;
  status?: string;
  invoiceUrl?: string | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  externalReference?: string | null;
  paymentLink?: string | null;
  subscription?: string | null;
}

export interface AsaasWebhookPayload {
  id?: string;
  event?: string;
  payment?: AsaasWebhookPayment;
}
