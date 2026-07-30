"use client";

import { usePublicIdentity } from "./public-identity-provider";

export function LegalDocumentUpdatedAt() {
  const { legalIdentity } = usePublicIdentity();
  if (!legalIdentity) return null;

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      Última atualização: {legalIdentity.formattedDocsUpdatedAt}
    </p>
  );
}

export function LegalIdentityDisclosure() {
  const { legalIdentity } = usePublicIdentity();
  if (!legalIdentity) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">
        Responsável pelo Prumo
      </h2>
      <address className="mt-2 not-italic">
        <span className="font-medium text-foreground">
          {legalIdentity.legalName}
        </span>
        <br />
        {legalIdentity.documentType} {legalIdentity.formattedDocument}
        <br />
        {legalIdentity.legalAddress}
        <br />
        Contato: {legalIdentity.supportEmail}
      </address>
    </section>
  );
}
