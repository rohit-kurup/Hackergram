// JSON-in-string helpers for list fields (portable across SQLite and Postgres).

export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function parseObj<T extends object>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const v = JSON.parse(value);
    return v && typeof v === "object" && !Array.isArray(v) ? { ...fallback, ...v } : fallback;
  } catch {
    return fallback;
  }
}

export const toList = (arr: string[]) => JSON.stringify(Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))));
