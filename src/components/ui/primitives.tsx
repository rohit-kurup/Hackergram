import { accentOf, cn, langColor } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function Chip({
  children,
  accent,
  className,
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  const a = accentOf(accent);
  return (
    <span className={cn("chip", className)} style={{ background: a.soft, color: a.text }}>
      {children}
    </span>
  );
}

export function TechTag({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("chip border border-paper-line bg-white text-ink-soft", className)}>
      <span className="h-2 w-2 rounded-full" style={{ background: langColor(name) }} />
      {name}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-paper-soft", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  accent = "purple",
  children,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  const a = accentOf(accent);
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rotate-6 rounded-3xl opacity-60" style={{ background: a.soft }} />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-lift">
          <Icon className="h-7 w-7" style={{ color: a.solid }} />
        </div>
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm text-ink-mute">{body}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function SectionTitle({ title, action, icon: Icon, accent }: { title: string; action?: React.ReactNode; icon?: LucideIcon; accent?: string }) {
  const a = accentOf(accent);
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[17px] font-bold">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: a.soft }}>
            <Icon className="h-4 w-4" style={{ color: a.solid }} />
          </span>
        )}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      title="Demo content seeded so you can try Hackergram. Not a real person or event."
      className={cn("chip border border-dashed border-ink-faint bg-paper-off text-[10px] uppercase tracking-wider text-ink-mute", className)}
    >
      Sample
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  accent = "purple",
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  const a = accentOf(accent);
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lift", a.grad)}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight md:text-[32px]">{title}</h1>
          {subtitle && <p className="text-sm text-ink-mute">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
