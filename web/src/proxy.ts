import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Applies to all routes except:
     * - _next/static
     * - _next/image
     * - favicon.ico, sitemap.xml, robots.txt
     * - static files such as images and fonts
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf)$).*)",
  ],
};
