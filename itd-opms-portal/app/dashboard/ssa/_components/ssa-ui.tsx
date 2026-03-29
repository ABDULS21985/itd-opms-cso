import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type SSAAccent = "emerald" | "indigo" | "amber" | "cyan" | "rose";

const ACCENTS: Record<
  SSAAccent,
  {
    primary: string;
    secondary: string;
    text: string;
    soft: string;
    ring: string;
    border: string;
    gradient: string;
    orb: string;
  }
> = {
  emerald: {
    primary: "#1B7340",
    secondary: "#10B981",
    text: "#E8FFF1",
    soft: "rgba(16, 185, 129, 0.12)",
    ring: "rgba(16, 185, 129, 0.22)",
    border: "rgba(27, 115, 64, 0.16)",
    gradient:
      "linear-gradient(135deg, rgba(7,31,20,0.98), rgba(13,74,41,0.95) 46%, rgba(27,115,64,0.92))",
    orb: "radial-gradient(circle, rgba(16,185,129,0.3), transparent 68%)",
  },
  indigo: {
    primary: "#4F46E5",
    secondary: "#8B5CF6",
    text: "#F4F2FF",
    soft: "rgba(99, 102, 241, 0.12)",
    ring: "rgba(99, 102, 241, 0.22)",
    border: "rgba(99, 102, 241, 0.16)",
    gradient:
      "linear-gradient(135deg, rgba(30,27,75,0.98), rgba(67,56,202,0.94) 48%, rgba(139,92,246,0.9))",
    orb: "radial-gradient(circle, rgba(139,92,246,0.32), transparent 68%)",
  },
  amber: {
    primary: "#B45309",
    secondary: "#F59E0B",
    text: "#FFF8EB",
    soft: "rgba(245, 158, 11, 0.12)",
    ring: "rgba(245, 158, 11, 0.22)",
    border: "rgba(180, 83, 9, 0.16)",
    gradient:
      "linear-gradient(135deg, rgba(69,26,3,0.98), rgba(146,64,14,0.95) 46%, rgba(245,158,11,0.9))",
    orb: "radial-gradient(circle, rgba(245,158,11,0.28), transparent 68%)",
  },
  cyan: {
    primary: "#0F766E",
    secondary: "#06B6D4",
    text: "#ECFEFF",
    soft: "rgba(6, 182, 212, 0.12)",
    ring: "rgba(6, 182, 212, 0.22)",
    border: "rgba(15, 118, 110, 0.16)",
    gradient:
      "linear-gradient(135deg, rgba(8,51,68,0.98), rgba(14,116,144,0.94) 46%, rgba(6,182,212,0.88))",
    orb: "radial-gradient(circle, rgba(6,182,212,0.28), transparent 68%)",
  },
  rose: {
    primary: "#BE123C",
    secondary: "#F43F5E",
    text: "#FFF1F3",
    soft: "rgba(244, 63, 94, 0.12)",
    ring: "rgba(244, 63, 94, 0.22)",
    border: "rgba(190, 18, 60, 0.16)",
    gradient:
      "linear-gradient(135deg, rgba(76,5,25,0.98), rgba(159,18,57,0.95) 48%, rgba(244,63,94,0.88))",
    orb: "radial-gradient(circle, rgba(244,63,94,0.28), transparent 68%)",
  },
};

function accentOf(name: SSAAccent) {
  return ACCENTS[name];
}

export function SSAHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent = "emerald",
  actions,
  chips,
  aside,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  accent?: SSAAccent;
  actions?: ReactNode;
  chips?: ReactNode;
  aside?: ReactNode;
}) {
  const colors = accentOf(accent);

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_28px_72px_rgba(15,23,42,0.12)] sm:p-8"
      style={{
        borderColor: colors.border,
        background: colors.gradient,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12),_transparent_24%),radial-gradient(circle_at_18%_18%,_rgba(255,255,255,0.08),_transparent_26%)]" />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-70"
        style={{ background: colors.orb }}
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-0 h-36 w-36 rounded-full opacity-60"
        style={{ background: colors.orb }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)]" />

      <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78 backdrop-blur-xl">
            {eyebrow}
          </div>

          <div className="mt-6 flex items-start gap-4">
            <div
              className="inline-flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/12 bg-white/10 shadow-lg"
              style={{ boxShadow: `0 20px 40px ${colors.ring}` }}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.045em] text-white sm:text-[2.6rem]">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                {description}
              </p>
            </div>
          </div>

          {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
          {chips ? <div className="mt-6 flex flex-wrap gap-3">{chips}</div> : null}
        </div>

        {aside ? <div className="grid gap-4">{aside}</div> : null}
      </div>
    </div>
  );
}

export function SSAHeroInsight({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent = "emerald",
  className = "",
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  accent?: SSAAccent;
  className?: string;
}) {
  const colors = accentOf(accent);

  return (
    <div
      className={`rounded-[1.45rem] border border-white/12 bg-white/10 p-4 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12"
          style={{ backgroundColor: `${colors.secondary}22` }}
        >
          <Icon size={18} className="text-white" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52">
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-5 text-lg font-semibold leading-6 text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/74">{description}</p>
    </div>
  );
}

export function SSAHeroChip({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium tracking-[0.08em] text-white/82">
      {children}
    </div>
  );
}

export function SSAStatCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = "emerald",
  loading = false,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  accent?: SSAAccent;
  loading?: boolean;
}) {
  const colors = accentOf(accent);

  return (
    <div className="group relative overflow-hidden rounded-[1.45rem] border border-[var(--border)]/80 bg-white/92 p-5 shadow-[0_18px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_45px_rgba(15,23,42,0.08)]">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.secondary}, transparent)`,
        }}
      />
      <div className="flex items-start justify-between gap-4">
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: colors.soft,
            borderColor: colors.ring,
          }}
        >
          <Icon size={19} style={{ color: colors.primary }} />
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{
            color: colors.primary,
            backgroundColor: colors.soft,
          }}
        >
          Live
        </span>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        <p className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
          {loading ? (
            <span className="inline-block h-9 w-16 animate-pulse rounded-xl bg-[var(--surface-2)]" />
          ) : (
            value
          )}
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{helper}</p>
      </div>
    </div>
  );
}

export function SSASectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[1.8rem] border border-[var(--border)]/80 bg-white/94 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]/70">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
