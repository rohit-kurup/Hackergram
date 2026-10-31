"use client";

import { toast } from "@/components/ui/Toast";

/** JSON fetch helper for client components. Shows a toast on failure and rethrows. */
export async function api<T = any>(
  url: string,
  opts: { method?: string; body?: unknown; silent?: boolean } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any).error ?? `Request failed (${res.status})`;
    if (!opts.silent) toast.error(msg);
    throw new Error(msg);
  }
  return data as T;
}
