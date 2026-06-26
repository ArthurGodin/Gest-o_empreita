import Link from "next/link";
import { HardHat } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans relative selection:bg-[#059669]/20">
      {/* Background Glows e Pattern "SaaS Premium" */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grid pattern suave */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#059669]/15 blur-[120px]" />
      </div>

      <div className="relative z-10 container flex min-h-screen flex-col items-center justify-center py-8">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-xl font-semibold tracking-tight"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#059669] to-[#10b981] text-white shadow-lg shadow-[#059669]/20">
            <HardHat className="h-6 w-6" />
          </div>
          Prumo
        </Link>
        <div className="w-full max-w-md relative group">
          <div className="absolute -inset-1 rounded-[1.5rem] bg-gradient-to-br from-[#059669]/20 to-transparent blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
