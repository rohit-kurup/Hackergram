/* eslint-disable @next/next/no-img-element */
import { ACCENTS, cn, hashAccent, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 40,
  ring,
  online,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  ring?: boolean;
  online?: boolean;
  className?: string;
}) {
  const a = ACCENTS[hashAccent(name)];
  return (
    <span
      className={cn("relative inline-flex shrink-0", ring && "rounded-full bg-brand-grad p-[2.5px]", className)}
      style={{ width: size + (ring ? 5 : 0), height: size + (ring ? 5 : 0) }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className={cn("h-full w-full rounded-full object-cover", ring && "border-2 border-white")}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white",
            a.grad,
            ring && "border-2 border-white",
          )}
          style={{ fontSize: Math.max(11, size * 0.38) }}
          aria-label={name}
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-mint"
          style={{ width: Math.max(10, size * 0.26), height: Math.max(10, size * 0.26) }}
          aria-label="Online"
        />
      )}
    </span>
  );
}

export const isOnline = (lastSeenAt: Date | string) => Date.now() - new Date(lastSeenAt).getTime() < 5 * 60_000;
