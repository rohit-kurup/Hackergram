import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse, HttpError, ok } from "@/lib/api";

/** One-click sign-in to the seeded demo account. Disabled in production unless DEMO_MODE=true. */
export async function POST() {
  try {
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") throw new HttpError(404, "Not available");
    const user = await db.user.findUnique({ where: { email: "demo@hackergram.dev" } });
    if (!user) throw new HttpError(404, "Demo account not seeded. Run `npm run db:seed`.");
    await createSession(user.id);
    return ok({ ok: true, next: "/" });
  } catch (e) {
    return errorResponse(e);
  }
}
