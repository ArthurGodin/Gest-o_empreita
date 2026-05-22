import Link from "next/link";
import { HardHat } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container flex min-h-screen flex-col items-center justify-center py-8">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-lg font-semibold"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="h-5 w-5" />
          </div>
          Gestão Empreita
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
