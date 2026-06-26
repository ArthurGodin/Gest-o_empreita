import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
];
const APP_PATHS = ["/app", "/dashboard"];

function safeInternalAppRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/app")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

function paidPlanFromQuery(value: string | null): "pro" | "ultimate" | null {
  return value === "pro" || value === "ultimate" ? value : null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAppRoute = APP_PATHS.some((p) => pathname.startsWith(p));
  const isPublicRoute = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    const redirectTo = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectTo =
      safeInternalAppRedirect(request.nextUrl.searchParams.get("redirect")) ??
      null;
    const plan = paidPlanFromQuery(request.nextUrl.searchParams.get("plan"));
    const destination =
      redirectTo ??
      (plan ? `/app/configuracoes/plano/checkout?plan=${plan}` : "/app");
    const url = new URL(destination, request.url);
    return NextResponse.redirect(url);
  }

  // Marca isPublicRoute como usada para o linter — lógica futura pode precisar.
  void isPublicRoute;

  return supabaseResponse;
}
