import { langColor } from "@/lib/utils";

/** GitHub-style contribution heatmap, recolored in Hackergram green→purple. */
export function ContributionHeatmap({ calendar }: { calendar: { date: string; count: number }[] }) {
  if (!calendar.length) return null;
  const days = calendar.slice(-364);
  const max = Math.max(1, ...days.map((d) => d.count));
  const level = (c: number) => (c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4)));
  const COLORS = ["#F0F0F4", "#C9F0DD", "#7FDDB3", "#35C98A", "#8257FF"];
  // Pad so the first column starts on Sunday.
  const pad = new Date(days[0]!.date).getDay();
  const cells = [...Array(pad).fill(null), ...days];
  const weeks: (typeof days[number] | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div>
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex gap-[3px]">
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {w.map((d, j) => (
                <span
                  key={j}
                  className="h-[11px] w-[11px] rounded-[3px]"
                  style={{ background: d ? COLORS[level(d.count)] : "transparent" }}
                  title={d ? `${d.count} contributions on ${d.date}` : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-semibold text-ink-faint">
        Less {COLORS.map((c) => <span key={c} className="h-[10px] w-[10px] rounded-[3px]" style={{ background: c }} />)} More
      </div>
    </div>
  );
}

/** Donut of language share by bytes. */
export function LanguageDonut({ bytes }: { bytes: Record<string, number> }) {
  const entries = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 6);
  const other = entries.slice(6).reduce((s, [, b]) => s + b, 0);
  if (other) top.push(["Other", other]);
  const total = top.reduce((s, [, b]) => s + b, 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0 -rotate-90" aria-label="Language breakdown">
        <circle cx="66" cy="66" r={R} fill="none" stroke="#F0F0F4" strokeWidth="18" />
        {top.map(([l, b]) => {
          const len = (b / total) * C;
          const el = (
            <circle key={l} cx="66" cy="66" r={R} fill="none" stroke={l === "Other" ? "#D6D5E0" : langColor(l)} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {top.map(([l, b]) => (
          <li key={l} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l === "Other" ? "#D6D5E0" : langColor(l) }} />
            <span className="flex-1 truncate font-medium">{l}</span>
            <span className="font-semibold text-ink-mute">{Math.round((b / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
