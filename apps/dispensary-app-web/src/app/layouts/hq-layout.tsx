import type { ReactNode } from 'react';

export function HqLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-cta focus:px-4 focus:py-2 focus:text-cta-foreground"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-background/80 px-5 py-0 backdrop-blur-md">
        <div className="flex h-[72px] w-full items-center justify-between gap-4">
          <p className="text-[32px] font-bold leading-10 tracking-tight text-primary">
            Namma MedMate
          </p>
          <p className="font-mono text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            Platform HQ
          </p>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
