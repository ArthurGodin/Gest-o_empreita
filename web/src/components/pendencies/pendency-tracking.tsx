"use client";

import Link from "next/link";
import { useEffect, type ComponentProps } from "react";
import type {
  OperationalPendencyCategory,
  OperationalPendencyPriority,
  OperationalPendencyType,
} from "@/lib/operational-pendencies-core";
import { trackProductEvent } from "@/lib/product-analytics";

type PendencyFilter = OperationalPendencyCategory | "all";

export function PendencyCenterTracker({
  category,
  count,
}: {
  category: PendencyFilter;
  count: number;
}) {
  useEffect(() => {
    trackProductEvent("pendency_center_opened", {
      category,
      count: Math.min(Math.max(count, 0), 100),
    });
  }, [category, count]);

  return null;
}

interface PendencyLinkProps extends Omit<ComponentProps<typeof Link>, "onClick"> {
  pendencyType: OperationalPendencyType;
  category: OperationalPendencyCategory;
  priority: OperationalPendencyPriority;
}

export function PendencyLink({
  pendencyType,
  category,
  priority,
  ...props
}: PendencyLinkProps) {
  return (
    <Link
      {...props}
      onClick={() => {
        trackProductEvent("pendency_clicked", {
          type: pendencyType,
          category,
          priority,
        });
      }}
    />
  );
}
