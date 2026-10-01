import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl tracking-tight">
          MogaFace
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 text-sm text-muted sm:gap-6">
          <Link href="/#how-it-works" className="hidden transition-colors hover:text-foreground sm:inline">
            How it works
          </Link>
          <Link href="/#privacy" className="hidden transition-colors hover:text-foreground sm:inline">
            Privacy
          </Link>
          <ButtonLink href="/analyze" className="!px-4 !py-2">
            Start analysis
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
