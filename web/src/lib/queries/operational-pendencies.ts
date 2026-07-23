import { cache } from "react";
import { todayBR } from "@/lib/dates";
import { buildOperationalPendencies } from "@/lib/operational-pendencies-core";
import { getBillingCharges } from "@/lib/queries/billing-charges";
import { getDeliverablePendencyInputs } from "@/lib/queries/deliverable-pendencies";
import { getProjects } from "@/lib/queries/projects";
import { getQuotes } from "@/lib/queries/quotes";

const OPERATIONAL_QUERY_LIMIT = 1_000;

export const getOperationalPendencies = cache(async () => {
  const [quotes, projects, charges, deliverables] = await Promise.all([
    getQuotes({ limit: OPERATIONAL_QUERY_LIMIT }),
    getProjects({ limit: OPERATIONAL_QUERY_LIMIT }),
    getBillingCharges(OPERATIONAL_QUERY_LIMIT),
    getDeliverablePendencyInputs(),
  ]);

  return buildOperationalPendencies({
    today: todayBR(),
    quotes,
    projects,
    charges,
    deliverables,
  });
});
