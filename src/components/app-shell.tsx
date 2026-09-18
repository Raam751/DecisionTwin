import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MainNav } from "@/components/main-nav";

/** Shared chrome only; pages retain ownership of their data and interactions. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="workspace-skip-link" href="#workspace-content">Skip to content</a>
      <header className="workspace-header">
        <div className="workspace-header-inner">
          <BrandLogo />
          <MainNav />
        </div>
      </header>
      <main id="workspace-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
