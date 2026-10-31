import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { directConversation } from "@/lib/conversations";
import { buildDeck } from "@/lib/deck";
import { parseList } from "@/lib/json";
import { projectIdeasFor, scoreCandidate } from "@/lib/matching";
import { notify } from "@/lib/notify";

/** GET /api/match?context=global|<projectId> — the swipe deck. */
export const GET = authed(async (req, { user }) => {
  const context = new URL(req.url).searchParams.get("context") || "global";
  return ok(await buildDeck(user, context));
});

const swipeSchema = z.object({
  targetId: z.string().min(1).max(40),
  direction: z.enum(["left", "right", "super"]),
  context: z.string().min(1).max(40),
});

/**
 * POST /api/match — record a swipe.
 *  - global: mutual right/super swipes create a persistent Match + conversation.
 *  - project: a right/super swipe invites the person to the project.
 */
export const POST = authed(
  async (req, { user }) => {
    const { targetId, direction, context } = await parseBody(req, swipeSchema);
    if (targetId === user.id) throw new HttpError(400, "You can't swipe on yourself");
    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, "User not found");

    let project: { id: string; title: string } | null = null;
    if (context !== "global") {
      project = await db.project.findFirst({ where: { id: context, ownerId: user.id }, select: { id: true, title: true } });
      if (!project) throw new HttpError(403, "You can only recruit for your own projects");
    }

    await db.swipe.upsert({
      where: { swiperId_targetId_context: { swiperId: user.id, targetId, context } },
      create: { swiperId: user.id, targetId, direction, context },
      update: { direction, createdAt: new Date() },
    });

    if (direction === "left") return ok({ matched: false });

    if (project) {
      await db.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: targetId } },
        create: { projectId: project.id, userId: targetId, status: "invited", role: "Collaborator" },
        update: {},
      });
      await notify({
        userId: targetId,
        actorId: user.id,
        type: "invite",
        title: `${user.name} invited you to join ${project.title}`,
        body: direction === "super" ? "⭐ Super-liked: they think you'd be a perfect fit." : "Open the project to accept or decline.",
        href: `/projects/${project.id}`,
      });
      return ok({ matched: false, invited: true });
    }

    if (direction === "super") {
      await notify({ userId: targetId, actorId: user.id, type: "match", title: `⭐ ${user.name} super-liked you on Match`, body: "Swipe right on them to match.", href: "/match" });
    }

    const reciprocal = await db.swipe.findFirst({
      where: { swiperId: targetId, targetId: user.id, context: "global", direction: { in: ["right", "super"] } },
    });
    if (!reciprocal) return ok({ matched: false });

    const [a, b] = [user.id, targetId].sort() as [string, string];
    let match = await db.match.findUnique({ where: { userAId_userBId_context: { userAId: a, userBId: b, context: "global" } } });
    if (!match) {
      const conversationId = await directConversation(user.id, targetId);
      match = await db.match.create({ data: { userAId: a, userBId: b, conversationId } });
      await db.message.create({ data: { conversationId, senderId: user.id, kind: "system", content: "You matched on Hackergram 🎉 Say hi!" } });
      await notify({ userId: targetId, actorId: user.id, type: "match", title: `It's a match with ${user.name}! 💞`, body: "Start a conversation.", href: `/messages/${conversationId}` });
      await notify({ userId: user.id, actorId: targetId, type: "match", title: `It's a match with ${target.name}! 💞`, body: "Start a conversation.", href: `/messages/${conversationId}` });
    }

    const s = scoreCandidate(user, target);
    const myLangs = [...parseList(user.languages), ...parseList(user.technologies)];
    const theirLangs = [...parseList(target.languages), ...parseList(target.technologies)];
    return ok({
      matched: true,
      match: {
        conversationId: match.conversationId,
        user: { id: target.id, name: target.name, username: target.username, image: target.image },
        sharedSkills: s.shared,
        sharedInterests: s.sharedInterests,
        complementary: theirLangs.filter((t) => !myLangs.includes(t)).slice(0, 4),
        ideas: projectIdeasFor(s.shared, [...s.sharedInterests, ...parseList(target.interests)]),
      },
    });
  },
  { limit: 120 },
);

/** DELETE /api/match?context= — undo your most recent swipe (unless it already created a match). */
export const DELETE = authed(async (req, { user }) => {
  const context = new URL(req.url).searchParams.get("context") || "global";
  const last = await db.swipe.findFirst({ where: { swiperId: user.id, context }, orderBy: { createdAt: "desc" } });
  if (!last) throw new HttpError(404, "Nothing to undo");
  const [a, b] = [user.id, last.targetId].sort() as [string, string];
  if (context === "global" && (await db.match.findUnique({ where: { userAId_userBId_context: { userAId: a, userBId: b, context } } }))) {
    throw new HttpError(400, "You already matched with this person");
  }
  await db.swipe.delete({ where: { id: last.id } });
  if (context !== "global") {
    await db.projectMember.deleteMany({ where: { projectId: context, userId: last.targetId, status: "invited" } });
  }
  return ok({ targetId: last.targetId });
});
