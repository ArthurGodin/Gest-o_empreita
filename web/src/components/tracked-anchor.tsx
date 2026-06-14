"use client";

import { forwardRef, type AnchorHTMLAttributes } from "react";
import {
  trackProductEvent,
  type ProductEventName,
} from "@/lib/product-analytics";

interface TrackedAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  analyticsEvent: ProductEventName;
  analyticsProperties?: Record<string, string | number | boolean | null>;
}

export const TrackedAnchor = forwardRef<HTMLAnchorElement, TrackedAnchorProps>(
  function TrackedAnchor(
    { analyticsEvent, analyticsProperties, onClick, ...props },
    ref,
  ) {
    return (
      <a
        ref={ref}
        onClick={(event) => {
          trackProductEvent(analyticsEvent, analyticsProperties);
          onClick?.(event);
        }}
        {...props}
      />
    );
  },
);
