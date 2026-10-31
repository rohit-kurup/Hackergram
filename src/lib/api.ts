import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z, type ZodTypeAny } from "zod";
import { getCurrentUser, type CurrentUser } from "./auth";
import { rateLimit } from "./ratelimit";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

type Handler<C> = (req: Request, ctx: C & { user: CurrentUser }) => Promise<Response>;

/**
 * Wraps an authenticated route handler: auth check, per-user rate limit,
 * and uniform error responses.
 */
export function authed<C extends { params: Promise<any> }>(
  handler: Handler<C>,
  opts: { limit?: number; windowMs?: number } = {},
) {
  return async (req: Request, ctx: C) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new HttpError(401, "Sign in required");
      if (req.method !== "GET") {
        const rl = rateLimit(`${user.id}:${new URL(req.url).pathname}`, opts.limit ?? 60, opts.windowMs ?? 60_000);
        if (!rl.ok) throw new HttpError(429, "Slow down a little — too many requests");
      }
      return await handler(req, { ...ctx, user });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input" },
      { status: 400 },
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
