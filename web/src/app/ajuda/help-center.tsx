"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ExternalLink,
  LifeBuoy,
  Mail,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { SupportContactLink } from "@/components/support-contact-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HELP_CATEGORIES,
  findHelpTopic,
  getHelpCategoryLabel,
  normalizeHelpSearch,
  searchHelpTopics,
  type HelpCategoryFilter,
} from "@/lib/help-center";
import { trackProductEvent } from "@/lib/product-analytics";
import { SUPPORT_EMAIL } from "@/lib/support-contact";
import { cn } from "@/lib/utils";

export function HelpCenter({ initialTopicId }: { initialTopicId: string | null }) {
  const initialTopic = findHelpTopic(initialTopicId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategoryFilter>(
    initialTopic?.category ?? "all",
  );
  const [openTopicIds, setOpenTopicIds] = useState<Set<string>>(
    () => new Set(initialTopicId ? [initialTopicId] : []),
  );
  const lastTrackedSearch = useRef("");
  const results = useMemo(
    () => searchHelpTopics(query, category),
    [category, query],
  );

  useEffect(() => {
    trackProductEvent("help_center_opened");
  }, []);

  useEffect(() => {
    const normalizedQuery = normalizeHelpSearch(query);
    if (normalizedQuery.length < 2 || normalizedQuery === lastTrackedSearch.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastTrackedSearch.current = normalizedQuery;
      trackProductEvent("help_search_used", {
        has_results: results.length > 0,
        result_count: Math.min(results.length, 20),
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [query, results.length]);

  useEffect(() => {
    if (!initialTopicId) return;
    document.getElementById(initialTopicId)?.scrollIntoView({ block: "center" });
  }, [initialTopicId]);

  const resultLabel = `${results.length} ${results.length === 1 ? "resposta encontrada" : "respostas encontradas"}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8 sm:pt-10">
      <section className="max-w-3xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <LifeBuoy aria-hidden="true" className="h-4 w-4" />
          Ajuda prática para usar o produto
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
          Central de Ajuda
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Encontre respostas sobre propostas, obras, recebimentos e conta sem
          precisar esperar atendimento.
        </p>
      </section>

      <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Conteúdo de ajuda">
          <div className="rounded-lg border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-4">
            <label htmlFor="help-search" className="text-sm font-semibold">
              O que você precisa resolver?
            </label>
            <div className="relative mt-2">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="help-search"
                name="help-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex.: Pix, orçamento, SINAPI ou cancelar…"
                className="pl-9 pr-10"
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  title="Limpar busca"
                  onClick={() => setQuery("")}
                  className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {resultLabel}. O texto pesquisado não é enviado ao suporte.
            </p>
          </div>

          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Filtrar por assunto"
          >
            <CategoryButton
              active={category === "all"}
              onClick={() => setCategory("all")}
            >
              Todos
            </CategoryButton>
            {HELP_CATEGORIES.map((item) => (
              <CategoryButton
                key={item.id}
                active={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </CategoryButton>
            ))}
          </div>

          {results.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-lg border bg-card">
              {results.map((topic) => (
                <details
                  id={topic.id}
                  key={topic.id}
                  open={openTopicIds.has(topic.id)}
                  className="group scroll-mt-20 border-b last:border-b-0"
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setOpenTopicIds((current) => {
                      const next = new Set(current);
                      if (isOpen) next.add(topic.id);
                      else next.delete(topic.id);
                      return next;
                    });
                    if (isOpen) {
                      trackProductEvent("help_topic_opened", {
                        topic_id: topic.id,
                        category: topic.category,
                      });
                    }
                  }}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block text-[11px] font-semibold uppercase text-primary">
                        {getHelpCategoryLabel(topic.category)}
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold leading-5">
                        {topic.question}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
                    />
                  </summary>
                  <div className="border-t bg-muted/15 px-4 py-4">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {topic.answer}
                    </p>
                    {topic.steps ? (
                      <ol className="mt-3 space-y-2">
                        {topic.steps.map((step, index) => (
                          <li
                            key={step}
                            className="flex items-start gap-2 text-sm leading-6"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {index + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center">
                      {topic.action ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={topic.action.href}>
                            {topic.action.label}
                            <ExternalLink aria-hidden="true" />
                          </Link>
                        </Button>
                      ) : null}
                      <SupportContactLink
                        source="help_center"
                        topicId={topic.id}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Mail aria-hidden="true" className="h-4 w-4" />
                        Falar sobre este assunto
                      </SupportContactLink>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border bg-card px-4 py-6 text-center">
              <Search aria-hidden="true" className="mx-auto h-5 w-5 text-muted-foreground" />
              <h2 className="mt-3 text-base font-semibold">
                Nenhuma resposta encontrada
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Tente uma palavra mais curta ou fale com o suporte sem enviar
                senha, cartão ou documento completo.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setQuery("")}>
                  Limpar busca
                </Button>
                <Button asChild>
                  <SupportContactLink source="help_empty_search">
                    <Mail aria-hidden="true" />
                    Enviar e-mail
                  </SupportContactLink>
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-lg border bg-card p-4 lg:sticky lg:top-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mail aria-hidden="true" className="h-4 w-4" />
          </div>
          <h2 className="mt-3 text-base font-semibold">Ainda precisa de ajuda?</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Escreva o que tentou fazer e o que aconteceu. O canal provisório de
            suporte é:
          </p>
          <SupportContactLink
            source="help_center"
            className="mt-3 block break-all text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SUPPORT_EMAIL}
          </SupportContactLink>
          <div className="mt-4 flex items-start gap-2 border-t pt-4">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Nunca envie senha, cartão, cookie, chave secreta ou documento
              completo.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs font-semibold">
            <Link href="/termos" className="hover:text-primary hover:underline">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-primary hover:underline">
              Privacidade
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:border-slate-400 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
