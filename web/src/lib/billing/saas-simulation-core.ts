export function shouldAllowSaasBillingSimulation({
  asaasApiKey,
  nodeEnv,
}: {
  asaasApiKey?: string | null;
  nodeEnv: string | undefined;
}): boolean {
  return !asaasApiKey && nodeEnv !== "production";
}
