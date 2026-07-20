"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { findHelpTopic } from "@/lib/help-center";
import {
  buildSupportMailto,
  type SupportSource,
} from "@/lib/support-contact";

interface SupportContactLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  source: SupportSource;
  topicId?: string;
  children: ReactNode;
}

export function SupportContactLink({
  source,
  topicId,
  children,
  ...props
}: SupportContactLinkProps) {
  const topic = topicId ? findHelpTopic(topicId) : null;

  return (
    <TrackedAnchor
      href={buildSupportMailto({ source, topicId })}
      analyticsEvent="support_email_clicked"
      analyticsProperties={{
        source,
        topic_id: topic?.id ?? null,
        category: topic?.category ?? null,
      }}
      {...props}
    >
      {children}
    </TrackedAnchor>
  );
}
