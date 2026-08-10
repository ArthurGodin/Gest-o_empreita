import {
  isBusinessSegment,
  type BusinessSegment,
} from "@/lib/business-segment";
import { normalizePaidPlan, type PaidPlan } from "@/lib/plans";

type QueryValue = string | readonly string[] | null | undefined;

export interface AcquisitionContext {
  businessSegment: BusinessSegment | null;
  plan: PaidPlan | null;
}

interface AcquisitionContextInput {
  businessSegment?: unknown;
  plan?: unknown;
}

interface AcquisitionQueryInput {
  perfil?: QueryValue;
  plan?: QueryValue;
}

interface SearchParamsReader {
  getAll(name: string): string[];
}

type LeadingParam = readonly [
  name: string,
  value: string | null | undefined,
];

export function normalizeAcquisitionBusinessSegment(
  value: unknown,
): BusinessSegment | null {
  return isBusinessSegment(value) ? value : null;
}

export function parseAcquisitionContext(
  input: AcquisitionQueryInput,
): AcquisitionContext {
  const profileValue = typeof input.perfil === "string" ? input.perfil : null;
  const planValue = typeof input.plan === "string" ? input.plan : null;

  return {
    businessSegment: normalizeAcquisitionBusinessSegment(profileValue),
    plan: normalizePaidPlan(planValue),
  };
}

export function acquisitionContextFromSearchParams(
  searchParams: SearchParamsReader,
): AcquisitionContext {
  const profileValues = searchParams.getAll("perfil");
  const planValues = searchParams.getAll("plan");

  return parseAcquisitionContext({
    perfil: profileValues.length === 1 ? profileValues[0] : profileValues,
    plan: planValues.length === 1 ? planValues[0] : planValues,
  });
}

export function buildAcquisitionHref(
  pathname: string,
  input: AcquisitionContextInput = {},
  leadingParams: readonly LeadingParam[] = [],
): string {
  const params = new URLSearchParams();

  for (const [name, value] of leadingParams) {
    if (!value || name === "plan" || name === "perfil") continue;
    params.set(name, value);
  }

  const context = parseAcquisitionContext({
    perfil: input.businessSegment as QueryValue,
    plan: input.plan as QueryValue,
  });

  if (context.plan) params.set("plan", context.plan);
  if (context.businessSegment) {
    params.set("perfil", context.businessSegment);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
