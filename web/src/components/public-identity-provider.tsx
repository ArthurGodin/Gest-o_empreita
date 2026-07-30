"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { PublicLegalIdentity } from "@/lib/legal-identity";

export interface PublicIdentityValue {
  supportEmail: string | null;
  legalIdentity: PublicLegalIdentity | null;
}

const emptyIdentity: PublicIdentityValue = {
  supportEmail: null,
  legalIdentity: null,
};

const PublicIdentityContext =
  createContext<PublicIdentityValue>(emptyIdentity);

export function PublicIdentityProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: PublicIdentityValue;
}) {
  return (
    <PublicIdentityContext.Provider value={value}>
      {children}
    </PublicIdentityContext.Provider>
  );
}

export function usePublicIdentity(): PublicIdentityValue {
  return useContext(PublicIdentityContext);
}
