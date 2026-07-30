"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { usePublicIdentity } from "@/components/public-identity-provider";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { findHelpTopic } from "@/lib/help-center";
import {
  buildSupportMailto,
  type SupportSource,
} from "@/lib/support-contact";
import { cn } from "@/lib/utils";

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
  const { supportEmail } = usePublicIdentity();

  if (!supportEmail) {
    return (
      <span
        aria-disabled="true"
        className={cn("cursor-not-allowed opacity-60", props.className)}
        title={props.title ?? "Canal de suporte em configuração"}
      >
        {children}
      </span>
    );
  }

  return (
    <TrackedAnchor
      href={buildSupportMailto({ source, topicId }, supportEmail)}
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
