import "server-only";

import { AsaasApiError, asaasRequest } from "@/lib/asaas/client";
import {
  createAdminClient,
  type AdminClient,
} from "@/lib/supabase/admin";
import {
  isPlanAtLeast,
  makeSaasSubscriptionReference,
  normalizeAppPlan,
  PLAN_DEFINITIONS,
  type AppPlan,
  type PaidPlan,
} from "@/lib/plans";
import {
  findReusableCheckoutPayment,
  hasPaidSubscriptionPayment,
  isSubscriptionInactive,
  normalizeAsaasStatus,
  type SaasPaymentSummary,
  type SaasSubscriptionSummary,
} from "./saas-billing-core";

const PAYMENT_LINK_STORAGE_PREFIX = "PAYMENT_LINK:";
const CHECKOUT_LOCK_TTL_MS = 2 * 60 * 1000;

interface AsaasSubscriptionResponse {
  id: string;
  status?: string | null;
  deleted?: boolean | null;
  externalReference?: string | null;
}

interface AsaasSubscriptionListResponse {
  data?: AsaasSubscriptionResponse[];
}

interface AsaasPaymentResponse {
  id: string;
  invoiceUrl: string | null;
  status: string;
}

interface AsaasPaymentLinkResponse {
  id: string;
  url: string | null;
}

interface AsaasPaymentLinkListResponse {
  data?: Array<AsaasPaymentLinkResponse & {
    active?: boolean | null;
    externalReference?: string | null;
  }>;
}

interface AsaasMutationResponse {
  id: string;
  deleted?: boolean | null;
  active?: boolean | null;
}

interface CompanySaasBillingRecord {
  id: string;
  plan: string | null;
  saas_asaas_customer_id: string | null;
  saas_asaas_subscription_id: string | null;
  saas_asaas_subscription_plan: string | null;
  saas_pending_payment_link_id: string | null;
  saas_pending_payment_link_url: string | null;
  saas_pending_plan: string | null;
  saas_pending_checkout_token: string | null;
  saas_pending_checkout_started_at: string | null;
}

interface StoredPaymentLink {
  id: string;
  url: string;
}

export interface SaasSubscriptionStatus {
  state:
    | "none"
    | "pending"
    | "active"
    | "active_without_subscription"
    | "inactive"
    | "unknown";
  currentPlan: AppPlan;
  targetPlan: PaidPlan | null;
  subscriptionId: string | null;
  paymentLinkId: string | null;
  checkoutKind: "subscription" | "payment_link" | null;
  subscriptionStatus: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  checkoutUrl: string | null;
  message?: string;
}

export class SaasCheckoutBlockedError extends Error {
  code:
    | "already_active"
    | "pending_other_plan"
    | "pending_without_checkout"
    | "paid_waiting_webhook"
    | "checkout_in_progress";
  pendingPlan?: PaidPlan | null;
  checkoutUrl?: string | null;

  constructor(
    code: SaasCheckoutBlockedError["code"],
    message: string,
    options: { pendingPlan?: PaidPlan | null; checkoutUrl?: string | null } = {},
  ) {
    super(message);
    this.name = "SaasCheckoutBlockedError";
    this.code = code;
    this.pendingPlan = options.pendingPlan;
    this.checkoutUrl = options.checkoutUrl;
  }
}

export async function createSaasSubscriptionCheckout({
  plan,
  companyId,
  companyName,
}: {
  plan: PaidPlan;
  companyId: string;
  companyName: string;
}): Promise<{
  checkoutUrl: string;
  reused: boolean;
  subscriptionId: string | null;
  paymentLinkId: string;
}> {
  const admin = createAdminClient();
  const company = await getCompanySaasBillingRecord(companyId);
  if (!company) {
    throw new Error("Empresa nao encontrada para gerar checkout SaaS.");
  }
  const currentPlan = normalizeAppPlan(company?.plan);

  if (isPlanAtLeast(currentPlan, plan)) {
    throw new SaasCheckoutBlockedError(
      "already_active",
      `Sua conta ja esta no ${PLAN_DEFINITIONS[currentPlan].label}.`,
    );
  }

  const existingStatus = await getSaasSubscriptionStatusFromRecord(
    company,
  );

  if (existingStatus.state === "pending") {
    if (
      existingStatus.checkoutKind === "payment_link" &&
      existingStatus.targetPlan === plan &&
      existingStatus.checkoutUrl &&
      existingStatus.paymentLinkId
    ) {
      const activePaymentLink = await findActiveSaasPaymentLink(plan, companyId);
      if (activePaymentLink?.url) {
        if (
          activePaymentLink.id !== existingStatus.paymentLinkId ||
          activePaymentLink.url !== existingStatus.checkoutUrl
        ) {
          const { error } = await admin
            .from("companies")
            .update({
              saas_pending_payment_link_id: activePaymentLink.id,
              saas_pending_payment_link_url: activePaymentLink.url,
            })
            .eq("id", companyId);
          if (error) throw error;
        }

        return {
          checkoutUrl: activePaymentLink.url,
          reused: true,
          subscriptionId: null,
          paymentLinkId: activePaymentLink.id,
        };
      }
    }

    if (
      existingStatus.checkoutKind === "payment_link" &&
      existingStatus.targetPlan === plan &&
      !existingStatus.checkoutUrl
    ) {
      if (isCheckoutLockFresh(company.saas_pending_checkout_started_at)) {
        throw new SaasCheckoutBlockedError(
          "checkout_in_progress",
          "O checkout ja esta sendo preparado. Aguarde alguns segundos e tente novamente.",
        );
      }
    }

    await clearPendingSaasCheckout(admin, company, existingStatus);
  }

  if (
    existingStatus.state === "active" &&
    existingStatus.currentPlan === "free"
  ) {
    throw new SaasCheckoutBlockedError(
      "paid_waiting_webhook",
      "O pagamento ja foi identificado e a ativacao esta sendo concluida. Aguarde alguns segundos antes de tentar novamente.",
    );
  }

  if (existingStatus.state === "unknown" && company?.saas_asaas_subscription_id) {
    throw new SaasCheckoutBlockedError(
      "pending_without_checkout",
      "Nao foi possivel confirmar o estado da assinatura atual no Asaas. Tente novamente em instantes antes de gerar outra cobranca.",
    );
  }

  const checkoutToken = crypto.randomUUID();
  const reserved = await reserveSaasCheckoutCreation(
    admin,
    companyId,
    plan,
    checkoutToken,
  );
  if (!reserved) {
    const refreshed = await getCompanySaasSubscriptionStatus(companyId);
    if (
      refreshed.state === "pending" &&
      refreshed.targetPlan === plan &&
      refreshed.paymentLinkId &&
      refreshed.checkoutUrl
    ) {
      return {
        checkoutUrl: refreshed.checkoutUrl,
        reused: true,
        subscriptionId: null,
        paymentLinkId: refreshed.paymentLinkId,
      };
    }

    throw new SaasCheckoutBlockedError(
      "checkout_in_progress",
      "Outro checkout esta sendo preparado. Aguarde alguns segundos e tente novamente.",
    );
  }

  let paymentLink: AsaasPaymentLinkResponse | null = null;
  try {
    paymentLink =
      (await findActiveSaasPaymentLink(plan, companyId)) ??
      (await createSaasPaymentLink({ plan, companyId, companyName }));

    if (!paymentLink.url) {
      throw new Error("Nao foi possivel gerar o link de pagamento do Asaas.");
    }

    const { data: saved, error: paymentLinkError } = await admin
      .from("companies")
      .update({
        saas_pending_payment_link_id: paymentLink.id,
        saas_pending_payment_link_url: paymentLink.url,
        saas_pending_plan: plan,
        saas_pending_checkout_token: null,
        saas_pending_checkout_started_at: null,
      })
      .eq("id", companyId)
      .eq("saas_pending_checkout_token", checkoutToken)
      .select("id")
      .maybeSingle();

    if (paymentLinkError || !saved) {
      await deactivateSaasPaymentLink(paymentLink.id);
      throw new Error("Nao foi possivel salvar o link de pagamento SaaS.");
    }

    return {
      checkoutUrl: paymentLink.url,
      reused: false,
      subscriptionId: null,
      paymentLinkId: paymentLink.id,
    };
  } catch (error) {
    await releaseSaasCheckoutCreation(admin, companyId, checkoutToken);
    throw error;
  }
}

export async function createProSubscriptionCheckout(
  companyId: string,
  companyName: string,
): Promise<{
  checkoutUrl: string;
  reused: boolean;
  subscriptionId: string | null;
  paymentLinkId: string;
}> {
  return createSaasSubscriptionCheckout({
    plan: "pro",
    companyId,
    companyName,
  });
}

export async function getCompanySaasSubscriptionStatus(
  companyId: string,
): Promise<SaasSubscriptionStatus> {
  const company = await getCompanySaasBillingRecord(companyId);
  if (!company) {
    return {
      state: "none",
      currentPlan: "free",
      targetPlan: null,
      subscriptionId: null,
      paymentLinkId: null,
      checkoutKind: null,
      subscriptionStatus: null,
      paymentId: null,
      paymentStatus: null,
      checkoutUrl: null,
      message: "Empresa nao encontrada.",
    };
  }

  return getSaasSubscriptionStatusFromRecord(company);
}

export function parseSaasPaymentLinkStorageId(
  value: string | null | undefined,
): StoredPaymentLink | null {
  if (!value?.startsWith(PAYMENT_LINK_STORAGE_PREFIX)) return null;

  const payload = value.slice(PAYMENT_LINK_STORAGE_PREFIX.length);
  const separator = payload.indexOf(":");
  if (separator <= 0) return null;

  const id = payload.slice(0, separator);
  const encodedUrl = payload.slice(separator + 1);
  if (!id || !encodedUrl) return null;

  try {
    const url = Buffer.from(encodedUrl, "base64url").toString("utf8");
    return url ? { id, url } : null;
  } catch {
    return null;
  }
}

export function saasPaymentLinkStorageLikePattern(paymentLinkId: string) {
  return `${PAYMENT_LINK_STORAGE_PREFIX}${paymentLinkId}:%`;
}

async function createSaasPaymentLink({
  plan,
  companyId,
  companyName,
}: {
  plan: PaidPlan;
  companyId: string;
  companyName: string;
}) {
  const planDefinition = PLAN_DEFINITIONS[plan];

  return asaasRequest<AsaasPaymentLinkResponse>("/paymentLinks", {
    method: "POST",
    body: {
      name: `Prumo - ${planDefinition.label}`,
      description: `Assinatura mensal do ${planDefinition.label} para ${companyName}.`,
      billingType: "UNDEFINED",
      chargeType: "RECURRENT",
      subscriptionCycle: "MONTHLY",
      value: planDefinition.priceCents / 100,
      dueDateLimitDays: 3,
      externalReference: makeSaasSubscriptionReference(plan, companyId),
      isAddressRequired: false,
    },
  });
}

async function findActiveSaasPaymentLink(
  plan: PaidPlan,
  companyId: string,
): Promise<AsaasPaymentLinkResponse | null> {
  const reference = makeSaasSubscriptionReference(plan, companyId);
  const result = await asaasRequest<AsaasPaymentLinkListResponse>(
    `/paymentLinks?externalReference=${encodeURIComponent(reference)}&active=true&limit=10`,
  );

  return (
    result.data?.find(
      (link) =>
        link.active !== false &&
        link.externalReference === reference &&
        Boolean(link.url),
    ) ?? null
  );
}

async function reserveSaasCheckoutCreation(
  admin: AdminClient,
  companyId: string,
  plan: PaidPlan,
  checkoutToken: string,
) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CHECKOUT_LOCK_TTL_MS).toISOString();
  const { data, error } = await admin
    .from("companies")
    .update({
      saas_pending_plan: plan,
      saas_pending_checkout_token: checkoutToken,
      saas_pending_checkout_started_at: now.toISOString(),
    })
    .eq("id", companyId)
    .is("saas_pending_payment_link_id", null)
    .or(
      `saas_pending_checkout_token.is.null,saas_pending_checkout_started_at.lt.${staleBefore}`,
    )
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function releaseSaasCheckoutCreation(
  admin: AdminClient,
  companyId: string,
  checkoutToken: string,
) {
  const { error } = await admin
    .from("companies")
    .update({
      saas_pending_plan: null,
      saas_pending_checkout_token: null,
      saas_pending_checkout_started_at: null,
    })
    .eq("id", companyId)
    .eq("saas_pending_checkout_token", checkoutToken);

  if (error) throw error;
}

function isCheckoutLockFresh(startedAt: string | null) {
  if (!startedAt) return false;
  const startedAtMs = Date.parse(startedAt);
  return (
    Number.isFinite(startedAtMs) &&
    Date.now() - startedAtMs < CHECKOUT_LOCK_TTL_MS
  );
}

async function clearPendingSaasCheckout(
  admin: AdminClient,
  company: CompanySaasBillingRecord,
  status: SaasSubscriptionStatus,
) {
  if (status.checkoutKind === "subscription" && status.subscriptionId) {
    await cancelSaasSubscription(status.subscriptionId);
  }

  if (status.checkoutKind === "payment_link" && status.paymentLinkId) {
    await deactivateSaasPaymentLink(status.paymentLinkId);
  }

  const clearsLegacyActiveCheckout = Boolean(
    parseSaasPaymentLinkStorageId(company.saas_asaas_subscription_id),
  ) || status.checkoutKind === "subscription";
  const patch = {
    saas_pending_payment_link_id: null,
    saas_pending_payment_link_url: null,
    saas_pending_plan: null,
    saas_pending_checkout_token: null,
    saas_pending_checkout_started_at: null,
    ...(clearsLegacyActiveCheckout
      ? {
          saas_asaas_subscription_id: null,
          saas_asaas_subscription_plan: null,
        }
      : {}),
  };
  const { error } = await admin
    .from("companies")
    .update(patch)
    .eq("id", company.id);

  if (error) {
    throw new Error("Nao foi possivel limpar a pendencia SaaS anterior.");
  }
}

export async function cancelSaasSubscription(subscriptionId: string) {
  try {
    await asaasRequest<AsaasMutationResponse>(`/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error instanceof AsaasApiError && error.status === 404) return;
    throw error;
  }
}

export async function cancelSupersededSaasSubscriptions({
  customerId,
  companyId,
  keepSubscriptionId,
  knownSubscriptionId,
}: {
  customerId: string | null;
  companyId: string;
  keepSubscriptionId: string | null;
  knownSubscriptionId: string | null;
}) {
  const ids = new Set<string>();
  if (
    knownSubscriptionId &&
    knownSubscriptionId !== keepSubscriptionId &&
    !parseSaasPaymentLinkStorageId(knownSubscriptionId)
  ) {
    ids.add(knownSubscriptionId);
  }

  if (customerId) {
    const subscriptions = await asaasRequest<AsaasSubscriptionListResponse>(
      `/subscriptions?customer=${encodeURIComponent(customerId)}&limit=100`,
    );
    const references = new Set([
      makeSaasSubscriptionReference("pro", companyId),
      makeSaasSubscriptionReference("ultimate", companyId),
    ]);

    for (const subscription of subscriptions.data ?? []) {
      if (
        subscription.id !== keepSubscriptionId &&
        subscription.externalReference &&
        references.has(subscription.externalReference) &&
        !isSubscriptionInactive(subscription)
      ) {
        ids.add(subscription.id);
      }
    }
  }

  await Promise.all([...ids].map((id) => cancelSaasSubscription(id)));
}

export async function cancelCompanySaasPlan(companyId: string) {
  const admin = createAdminClient();
  const company = await getCompanySaasBillingRecord(companyId);
  if (!company) throw new Error("Empresa nao encontrada para cancelar o plano.");

  const activeSubscriptionId = parseSaasPaymentLinkStorageId(
    company.saas_asaas_subscription_id,
  )
    ? null
    : company.saas_asaas_subscription_id;
  const legacyPaymentLink = parseSaasPaymentLinkStorageId(
    company.saas_asaas_subscription_id,
  );
  const pendingPaymentLinkId =
    company.saas_pending_payment_link_id ?? legacyPaymentLink?.id ?? null;

  await Promise.all([
    cancelSupersededSaasSubscriptions({
      customerId: company.saas_asaas_customer_id,
      companyId,
      keepSubscriptionId: null,
      knownSubscriptionId: activeSubscriptionId,
    }),
    pendingPaymentLinkId
      ? deactivateSaasPaymentLink(pendingPaymentLinkId)
      : Promise.resolve(),
  ]);

  const { error } = await admin
    .from("companies")
    .update({
      plan: "free",
      saas_asaas_subscription_id: null,
      saas_asaas_subscription_plan: null,
      saas_pending_payment_link_id: null,
      saas_pending_payment_link_url: null,
      saas_pending_plan: null,
      saas_pending_checkout_token: null,
      saas_pending_checkout_started_at: null,
    })
    .eq("id", companyId);

  if (error) {
    throw new Error("A cobranca foi encerrada, mas o plano nao foi atualizado.");
  }
}

export async function deactivateSaasPaymentLink(paymentLinkId: string) {
  try {
    await asaasRequest<AsaasMutationResponse>(`/paymentLinks/${paymentLinkId}`, {
      method: "PUT",
      body: { active: false },
    });
  } catch (error) {
    if (error instanceof AsaasApiError && error.status === 404) return;
    throw error;
  }
}

async function getCompanySaasBillingRecord(
  companyId: string,
): Promise<CompanySaasBillingRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select(
      "id, plan, saas_asaas_customer_id, saas_asaas_subscription_id, saas_asaas_subscription_plan, saas_pending_payment_link_id, saas_pending_payment_link_url, saas_pending_plan, saas_pending_checkout_token, saas_pending_checkout_started_at",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  return (data as CompanySaasBillingRecord | null) ?? null;
}

async function getSaasSubscriptionStatusFromRecord(
  company: CompanySaasBillingRecord,
): Promise<SaasSubscriptionStatus> {
  const currentPlan = normalizeAppPlan(company.plan);
  const pendingPlan =
    company.saas_pending_plan === "pro" ||
    company.saas_pending_plan === "ultimate"
      ? company.saas_pending_plan
      : null;
  const hasPendingCheckout = Boolean(
    company.saas_pending_payment_link_id ||
      company.saas_pending_checkout_token ||
      company.saas_pending_plan,
  );

  if (
    hasPendingCheckout &&
    (!pendingPlan || !isPlanAtLeast(currentPlan, pendingPlan))
  ) {
    return {
      state: "pending",
      currentPlan,
      targetPlan: pendingPlan,
      subscriptionId: null,
      paymentLinkId: company.saas_pending_payment_link_id,
      checkoutKind: "payment_link",
      subscriptionStatus: null,
      paymentId: null,
      paymentStatus: null,
      checkoutUrl: company.saas_pending_payment_link_url,
      message:
        company.saas_pending_checkout_token &&
        !company.saas_pending_payment_link_url
          ? "O checkout esta sendo preparado."
          : undefined,
    };
  }

  const targetPlan =
    company.saas_asaas_subscription_plan === "pro" ||
    company.saas_asaas_subscription_plan === "ultimate"
      ? company.saas_asaas_subscription_plan
      : null;
  const storedPaymentLink = parseSaasPaymentLinkStorageId(
    company.saas_asaas_subscription_id,
  );

  if (storedPaymentLink) {
    const paymentLinkIsPending =
      targetPlan ? !isPlanAtLeast(currentPlan, targetPlan) : currentPlan === "free";

    return {
      state: paymentLinkIsPending ? "pending" : "active_without_subscription",
      currentPlan,
      targetPlan: paymentLinkIsPending ? targetPlan : null,
      subscriptionId: null,
      paymentLinkId: storedPaymentLink.id,
      checkoutKind: paymentLinkIsPending ? "payment_link" : null,
      subscriptionStatus: null,
      paymentId: null,
      paymentStatus: null,
      checkoutUrl: paymentLinkIsPending ? storedPaymentLink.url : null,
    };
  }

  if (!company.saas_asaas_subscription_id) {
    return {
      state: currentPlan === "free" ? "none" : "active_without_subscription",
      currentPlan,
      targetPlan: null,
      subscriptionId: null,
      paymentLinkId: null,
      checkoutKind: null,
      subscriptionStatus: null,
      paymentId: null,
      paymentStatus: null,
      checkoutUrl: null,
    };
  }

  try {
    const [subscription, payments] = await Promise.all([
      getSaasSubscription(company.saas_asaas_subscription_id),
      getSaasSubscriptionPayments(company.saas_asaas_subscription_id),
    ]);
    const checkoutPayment = findReusableCheckoutPayment(payments);

    if (
      checkoutPayment?.invoiceUrl &&
      !hasPaidSubscriptionPayment(payments) &&
      !isSubscriptionInactive(subscription)
    ) {
      return {
        state: "pending",
        currentPlan,
        targetPlan,
        subscriptionId: subscription.id,
        paymentLinkId: null,
        checkoutKind: "subscription",
        subscriptionStatus: normalizeAsaasStatus(subscription.status),
        paymentId: checkoutPayment.id,
        paymentStatus: normalizeAsaasStatus(checkoutPayment.status),
        checkoutUrl: checkoutPayment.invoiceUrl,
      };
    }

    if (currentPlan !== "free" || hasPaidSubscriptionPayment(payments)) {
      return {
        state: "active",
        currentPlan,
        targetPlan,
        subscriptionId: subscription.id,
        paymentLinkId: null,
        checkoutKind: "subscription",
        subscriptionStatus: normalizeAsaasStatus(subscription.status),
        paymentId: checkoutPayment?.id ?? null,
        paymentStatus: normalizeAsaasStatus(checkoutPayment?.status),
        checkoutUrl: checkoutPayment?.invoiceUrl ?? null,
      };
    }

    return {
      state: isSubscriptionInactive(subscription) ? "inactive" : "unknown",
      currentPlan,
      targetPlan,
      subscriptionId: subscription.id,
      paymentLinkId: null,
      checkoutKind: "subscription",
      subscriptionStatus: normalizeAsaasStatus(subscription.status),
      paymentId: checkoutPayment?.id ?? null,
      paymentStatus: normalizeAsaasStatus(checkoutPayment?.status),
      checkoutUrl: checkoutPayment?.invoiceUrl ?? null,
    };
  } catch (error) {
    return {
      state: "unknown",
      currentPlan,
      targetPlan,
      subscriptionId: company.saas_asaas_subscription_id,
      paymentLinkId: null,
      checkoutKind: "subscription",
      subscriptionStatus: null,
      paymentId: null,
      paymentStatus: null,
      checkoutUrl: null,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel consultar a assinatura no Asaas.",
    };
  }
}

async function getSaasSubscription(
  subscriptionId: string,
): Promise<SaasSubscriptionSummary> {
  return asaasRequest<AsaasSubscriptionResponse>(`/subscriptions/${subscriptionId}`);
}

async function getSaasSubscriptionPayments(
  subscriptionId: string,
): Promise<SaasPaymentSummary[]> {
  const payments = await asaasRequest<{ data: AsaasPaymentResponse[] }>(
    `/payments?subscription=${subscriptionId}`,
  );

  return (payments.data ?? []).map((payment) => ({
    id: payment.id,
    status: payment.status,
    invoiceUrl: payment.invoiceUrl,
  }));
}
