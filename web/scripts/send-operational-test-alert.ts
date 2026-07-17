import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.env.PRUMO_ENV_DIR?.trim() || process.cwd());

async function main() {
  if (process.env.CONFIRM_OPERATIONAL_TEST_ALERT !== "SEND") {
    throw new Error(
      "Set CONFIRM_OPERATIONAL_TEST_ALERT=SEND to send one controlled alert.",
    );
  }

  const { sendOperationalAlert } = await import("@/lib/alerts");
  const now = new Date();
  const result = await sendOperationalAlert({
    area: "monitoramento_operacional",
    severity: "warning",
    title: "[TESTE] Canal operacional Prumo",
    message:
      "Este e um teste controlado do canal de monitoramento. Nenhum incidente real foi aberto e nenhum dado financeiro foi alterado.",
    dedupeKey: `operational:test:${now.toISOString().slice(0, 10)}`,
    context: {
      test_kind: "controlled_delivery",
      sent_at: now.toISOString(),
    },
  });

  if (!result.sent) {
    throw new Error("Operational test alert was not accepted.");
  }

  console.log("Operational test alert accepted by the provider.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Test alert failed.");
  process.exitCode = 1;
});
