import { cn } from "@/lib/utils";

/** The Hackergram mark: an "H" bridge (two builders, one connection) plus a spark. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="hg-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8257FF" />
          <stop offset=".55" stopColor="#FF668C" />
          <stop offset="1" stopColor="#FF984F" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#hg-g)" />
      <path d="M22 18v28M42 18v28M22 32h20" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="48" cy="16" r="5" fill="#FFD65A" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

export function Logo({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="font-display text-[22px] font-extrabold tracking-tight text-ink">
        hacker<span className="bg-brand-grad bg-clip-text text-transparent">gram</span>
      </span>
    </span>
  );
}
