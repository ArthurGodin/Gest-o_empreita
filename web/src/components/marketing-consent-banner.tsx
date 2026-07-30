"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MARKETING_CONSENT_CHANGED_EVENT,
  marketingConsentFromCookieHeader,
  serializeMarketingConsentCookie,
  type MarketingConsentState,
} from "@/lib/marketing-consent";
import { cn } from "@/lib/utils";

interface MarketingConsentProps {
  pixelId?: string;
}

export function MarketingConsentManager({
  pixelId,
}: MarketingConsentProps) {
  const { consent, choose } = useMarketingConsent();
  const pathname = usePathname();
  const configured = Boolean(pixelId);

  return (
    <>
      {configured && consent === "granted" && pixelId ? (
        <MetaPixel pixelId={pixelId} />
      ) : null}
      {configured && consent === null && pathname !== "/privacidade" ? (
        <aside
          aria-label="Preferências de medição"
          className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-2xl rounded-lg border bg-background p-3 shadow-lg md:bottom-4"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Sua escolha de medição
              </p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                O Prumo pode usar a Meta para medir anúncios. Isso é opcional e
                não interfere no uso do produto.{" "}
                <Link
                  href="/privacidade"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Ver detalhes
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => choose("denied")}
            >
              Somente necessários
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => choose("granted")}
            >
              Aceitar medição
            </Button>
          </div>
        </aside>
      ) : null}
    </>
  );
}

export function MarketingConsentSettings({
  pixelId,
}: MarketingConsentProps) {
  const { consent, choose } = useMarketingConsent();
  const configured = Boolean(pixelId);

  if (!configured) {
    return (
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        A medição de marketing está desativada neste ambiente.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm leading-6 text-muted-foreground" aria-live="polite">
        {consent === "granted"
          ? "Escolha atual: medição aceita."
          : consent === "denied"
            ? "Escolha atual: somente cookies necessários."
            : "Nenhuma escolha foi registrada ainda."}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ConsentChoiceButton
          active={consent === "denied"}
          onClick={() => choose("denied")}
        >
          Somente necessários
        </ConsentChoiceButton>
        <ConsentChoiceButton
          active={consent === "granted"}
          onClick={() => choose("granted")}
        >
          Aceitar medição
        </ConsentChoiceButton>
      </div>
    </div>
  );
}

function ConsentChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={active}
      className={cn(
        "min-h-11 w-full justify-center",
        active && "border-primary text-foreground",
      )}
      onClick={onClick}
    >
      {active ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
      {children}
    </Button>
  );
}

function useMarketingConsent() {
  const consent = useSyncExternalStore(
    subscribeToMarketingConsent,
    currentMarketingConsent,
    serverMarketingConsent,
  );

  const choose = useCallback((next: MarketingConsentState) => {
    document.cookie = serializeMarketingConsentCookie(next, {
      secure: window.location.protocol === "https:",
    });

    if (typeof window.fbq === "function") {
      window.fbq("consent", next === "granted" ? "grant" : "revoke");
      if (next === "granted") window.fbq("track", "PageView");
    }

    window.dispatchEvent(
      new CustomEvent<MarketingConsentState>(
        MARKETING_CONSENT_CHANGED_EVENT,
        { detail: next },
      ),
    );
  }, []);

  return { consent, choose };
}

function subscribeToMarketingConsent(onStoreChange: () => void) {
  window.addEventListener(MARKETING_CONSENT_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener(MARKETING_CONSENT_CHANGED_EVENT, onStoreChange);
  };
}

function currentMarketingConsent() {
  return marketingConsentFromCookieHeader(document.cookie);
}

function serverMarketingConsent(): undefined {
  return undefined;
}

function MetaPixel({ pixelId }: { pixelId: string }) {
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', ${JSON.stringify(pixelId)});
        fbq('consent', 'grant');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
