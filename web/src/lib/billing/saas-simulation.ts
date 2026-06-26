import "server-only";

import { serverEnv } from "@/lib/env-server";
import { shouldAllowSaasBillingSimulation } from "./saas-simulation-core";

export function isSaasBillingSimulationEnabled(): boolean {
  return shouldAllowSaasBillingSimulation({
    asaasApiKey: serverEnv.ASAAS_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
}
