"use client";

import { createContext, useContext, useMemo } from "react";
import {
  getBusinessVocabulary,
  normalizeBusinessSegment,
  type BusinessSegment,
} from "@/lib/business-segment";

const BusinessSegmentContext =
  createContext<BusinessSegment>("construction");

export function BusinessSegmentProvider({
  segment,
  children,
}: {
  segment: BusinessSegment;
  children: React.ReactNode;
}) {
  return (
    <BusinessSegmentContext.Provider value={segment}>
      {children}
    </BusinessSegmentContext.Provider>
  );
}

export function useBusinessSegment() {
  return useContext(BusinessSegmentContext);
}

export function useBusinessVocabulary() {
  const segment = useBusinessSegment();
  return useMemo(
    () => getBusinessVocabulary(normalizeBusinessSegment(segment)),
    [segment],
  );
}
