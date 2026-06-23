import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/SignOutButton";

export type DashboardView = "synthese" | "hebdo" | "mensuel" | "cumule" | "pmc" | "donnees" | "records" | "projections";
export type ShellActiveItem = "dashboard" | DashboardView | "activities" | "imports" | "upload";

type SidebarIconName =
  | "grid"
  | "trend"
  | "calendar"
  | "stack"
  | "pmc"
  | "activity"
  | "upload"
  | "trophy"
  | "clock";

function SidebarIcon({ name, active = false }: { name: SidebarIconName; active?: boolean }) {
  const common = {
    fill: "none",
    stroke: active ? "#ffffff" : "#e5e7eb",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      {name === "grid" && (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.5" {...common} />
          <rect x="14" y="4" width="6" height="6" rx="1.5" {...common} />
          <rect x="4" y="14" width="6" height="6" rx="1.5" {...common} />
          <rect x="14" y="14" width="6" height="6" rx="1.5" {...common} />
        </>
      )}
      {name === "trend" && <path d="M4 16l4-4 4 3 6-7 2 2" {...common} />}
      {name === "calendar" && (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" {...common} />
          <path d="M8 3v4M16 3v4M4 10h16" {...common} />
        </>
      )}
      {name === "stack" && (
        <>
          <path d="M12 4l8 4-8 4-8-4 8-4z" {...common} />
          <path d="M4 12l8 4 8-4M4 16l8 4 8-4" {...common} />
        </>
      )}
      {name === "pmc" && (
        <>
          <path d="M4 17h16" {...common} />
          <path d="M5 14l3-4 3 3 4-7 4 5" {...common} />
        </>
      )}
      {name === "activity" && <path d="M4 13h4l2-6 4 10 2-4h4" {...common} />}
      {name === "upload" && (
        <>
          <path d="M12 16V4" {...common} />
          <path d="M7 9l5-5 5 5" {...common} />
          <path d="M5 20h14" {...common} />
        </>
      )}
      {name === "trophy" && (
        <>
          <path d="M8 4h8v4a4 4 0 0 1-8 0V4z" {...common} />
          <path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 12v5M9 20h6" {...common} />
        </>
      )}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="8" {...common} />
          <path d="M12 8v5l3 2" {...common} />
        </>
      )}
    </svg>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: SidebarIconName;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[50px] items-center gap-4 rounded-2xl px-4 py-3 text-[0.95rem] leading-6 transition ${
        active ? "bg-indigo-600 shadow-[0_12px_30px_rgba(79,70,229,0.35)]" : "hover:bg-white/5"
      }`}
      style={{ color: "#ffffff", fontWeight: 400 }}
    >
      <span className="flex h-6 min-w-6 items-center justify-center text-white">
        <SidebarIcon name={icon} active={active} />
      </span>
      <span>{label}</span>
    </Link>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="px-4 pb-4 text-xs uppercase tracking-[0.14em]" style={{ color: "#ffffff", fontWeight: 500 }}>
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function isMobileDataItem(activeItem: ShellActiveItem) {
  return activeItem === "donnees" || activeItem === "activities" || activeItem === "imports" || activeItem === "upload";
}

function MobileNavLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: SidebarIconName;
  active?: boolean;
}) {
  return (
    <Link href={href} className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-center">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
          active ? "bg-indigo-600 shadow-[0_10px_22px_rgba(79,70,229,0.24)]" : "bg-slate-100"
        }`}
      >
        <SidebarIcon name={icon} active={active} />
      </span>
      <span className={`text-[0.72rem] leading-4 ${active ? "font-semibold text-slate-950" : "text-slate-500"}`}>{label}</span>
    </Link>
  );
}

export function AppShell({
  activeItem,
  currentSeason,
  currentWeek,
  children,
}: {
  activeItem: ShellActiveItem;
  currentSeason: number;
  currentWeek: number;
  children: ReactNode;
}) {
  const seasonProgress = Math.min(100, Math.round((Math.max(1, currentWeek) / 52) * 100));

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f5f7fb]/95 px-4 py-4 backdrop-blur lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-950">Season Analyzer</div>
            <div className="mt-1 text-sm text-slate-500">
              Saison {currentSeason - 1} / {currentSeason} · semaine {currentWeek}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/upload"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_12px_24px_rgba(79,70,229,0.24)]"
              aria-label="Importer un fichier"
            >
              <SidebarIcon name="upload" active />
            </Link>
            <SignOutButton compact className="px-3" />
          </div>
        </div>
      </div>

      <div className="flex w-full gap-0 lg:min-w-[1280px]">
        <aside className="hidden min-h-screen w-[276px] shrink-0 flex-col bg-[#0d1426] px-5 py-7 text-white shadow-[16px_0_40px_rgba(15,23,42,0.14)] lg:flex">
          <div className="flex items-center justify-start gap-4 px-1 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl">
              <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="9" cy="22" r="5" fill="none" stroke="#ffffff" strokeWidth="2" />
                <circle cx="23" cy="22" r="5" fill="none" stroke="#ffffff" strokeWidth="2" />
                <path d="M9 22l5-9 4 9M14 13h6l3 9M13 9h5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-[1rem] tracking-[0.06em]" style={{ color: "#ffffff", fontWeight: 600 }}>SAISON</div>
              <div className="text-[1rem] tracking-[0.06em]" style={{ color: "#ffffff", fontWeight: 600 }}>ANALYZER</div>
            </div>
          </div>

          <nav className="mt-10 space-y-9">
            <div className="space-y-3">
              <SidebarLink href="/dashboard" label="Tableau de bord" icon="grid" active={activeItem === "dashboard"} />
            </div>

            <SidebarSection title="Analyses">
              <SidebarLink href="/dashboard?view=hebdo" label="Hebdomadaire" icon="trend" active={activeItem === "hebdo"} />
              <SidebarLink href="/dashboard?view=mensuel" label="Mensuel" icon="calendar" active={activeItem === "mensuel"} />
              <SidebarLink href="/dashboard?view=cumule" label="Cumule" icon="stack" active={activeItem === "cumule"} />
              <SidebarLink href="/dashboard?view=pmc" label="PMC" icon="pmc" active={activeItem === "pmc"} />
            </SidebarSection>

            <SidebarSection title="Donnees">
              <SidebarLink href="/activities" label="Activites" icon="activity" active={activeItem === "activities"} />
              <SidebarLink href="/imports" label="Imports" icon="upload" active={activeItem === "imports"} />
            </SidebarSection>

            <SidebarSection title="Performance">
              <SidebarLink href="/dashboard?view=records" label="Records" icon="trophy" active={activeItem === "records"} />
              <SidebarLink href="/dashboard?view=projections" label="Projections" icon="clock" active={activeItem === "projections"} />
            </SidebarSection>
          </nav>

          <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm" style={{ color: "#ffffff", fontWeight: 400 }}>Saison en cours</div>
            <div className="mt-2 text-[1.7rem]" style={{ color: "#ffffff", fontWeight: 400 }}>
              {currentSeason - 1} / {currentSeason}
            </div>
            <div className="mt-1 text-sm" style={{ color: "#ffffff", fontWeight: 400 }}>jusqu&apos;a la semaine {currentWeek}</div>

            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                style={{ width: `${seasonProgress}%` }}
              />
            </div>
            <div className="mt-3 text-right text-sm" style={{ color: "#ffffff", fontWeight: 400 }}>
              {seasonProgress}%
            </div>

            <SignOutButton />
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 pb-28 pt-5 lg:p-7">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 shadow-[0_-16px_32px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-start justify-between gap-1">
          <MobileNavLink href="/dashboard" label="Synthese" icon="grid" active={activeItem === "dashboard" || activeItem === "synthese"} />
          <MobileNavLink href="/dashboard?view=hebdo" label="Hebdo" icon="trend" active={activeItem === "hebdo"} />
          <MobileNavLink href="/dashboard?view=cumule" label="Cumule" icon="stack" active={activeItem === "cumule"} />
          <MobileNavLink href="/dashboard?view=pmc" label="PMC" icon="pmc" active={activeItem === "pmc"} />
          <MobileNavLink href="/dashboard?view=donnees" label="Donnees" icon="activity" active={isMobileDataItem(activeItem)} />
        </div>
      </nav>
    </main>
  );
}
