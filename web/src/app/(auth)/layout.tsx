import Link from "next/link";
import { HardHat } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-5 flex w-fit items-center gap-2 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat aria-hidden="true" className="h-5 w-5" />
          </span>
          Prumo
        </Link>
        {children}
      </div>
    </main>
  );
}
