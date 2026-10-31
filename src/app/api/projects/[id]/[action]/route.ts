import { z } from "zod";
import { db } from "@/lib/db";
import { authed, HttpError, ok, parseBody } from "@/lib/api";
import { projectConversation } from "@/lib/conversations";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string; action: string }> };

/**
 * Team formation actions:
 *  pin      (owner)   toggle pinned on your portfolio
 *  join     (anyone)  request to join with a short note
 *  respond  (invitee) accept/decline an invitation
 *  member   (owner)   accept/decline a request, or remove a member
 *  leave    (member)  leave the team
 */
export const POST = authed<Ctx>(async (req, { params, user }) => {
  const { id, action } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new HttpError(404, "Project not found");
  const isOwner = project.ownerId === user.id;
  const key = { projectId_userId: { projectId: id, userId: user.id } };

  switch (action) {
    case "pin": {
      if (!isOwner) throw new HttpError(403, "Not your project");
      const p = await db.project.update({ where: { id }, data: { pinned: !project.pinned } });
      return ok({ pinned: p.pinned });
    }
    case "join": {
      if (isOwner) throw new HttpError(400, "You own this project");
      if (!project.isListing || project.status !== "open") throw new HttpError(400, "This project isn't recruiting right now");
      const { note, role } = await parseBody(req, z.object({ note: z.string().trim().max(500).default(""), role: z.string().trim().max(60).default("Collaborator") }));
      const existing = await db.projectMember.findUnique({ where: key });
      if (existing?.status === "active") throw new HttpError(400, "You're already on this team");
      if (existing?.status === "invited") {
        await db.projectMember.update({ where: key, data: { status: "active", role } });
        await projectConversation(id);
        await notify({ userId: project.ownerId, actorId: user.id, type: "team", title: `${user.name} joined ${project.title}`, href: `/projects/${id}` });
        return ok({ status: "active" });
      }
      await db.projectMember.upsert({ where: key, create: { projectId: id, userId: user.id, role, status: "requested" }, update: { status: "requested", role } });
      await notify({ userId: project.ownerId, actorId: user.id, type: "collab", title: `${user.name} wants to join ${project.title}`, body: note ? `“${note}”` : `Role: ${role}`, href: `/projects/${id}` });
      return ok({ status: "requested" });
    }
    case "respond": {
      const { accept } = await parseBody(req, z.object({ accept: z.boolean() }));
      const m = await db.projectMember.findUnique({ where: key });
      if (!m || m.status !== "invited") throw new HttpError(400, "No pending invitation");
      if (!accept) {
        await db.projectMember.delete({ where: key });
        return ok({ status: "declined" });
      }
      await db.projectMember.update({ where: key, data: { status: "active" } });
      const conversationId = await projectConversation(id);
      await notify({ userId: project.ownerId, actorId: user.id, type: "team", title: `${user.name} accepted your invite to ${project.title} 🎉`, href: `/messages/${conversationId}` });
      return ok({ status: "active", conversationId });
    }
    case "member": {
      if (!isOwner) throw new HttpError(403, "Only the owner can manage members");
      const body = await parseBody(req, z.object({ userId: z.string().max(40), decision: z.enum(["accept", "decline", "remove"]) }));
      if (body.userId === user.id) throw new HttpError(400, "You can't remove yourself");
      const mk = { projectId_userId: { projectId: id, userId: body.userId } };
      const m = await db.projectMember.findUnique({ where: mk });
      if (!m) throw new HttpError(404, "Member not found");
      if (body.decision === "accept") {
        await db.projectMember.update({ where: mk, data: { status: "active" } });
        const conversationId = await projectConversation(id);
        await notify({ userId: body.userId, actorId: user.id, type: "team", title: `You're in! Welcome to ${project.title} 🎉`, body: "Say hi in the team chat.", href: `/messages/${conversationId}` });
      } else {
        await db.projectMember.delete({ where: mk });
        const convo = await db.conversation.findFirst({ where: { kind: "project", projectId: id } });
        if (convo) await db.conversationMember.deleteMany({ where: { conversationId: convo.id, userId: body.userId } });
      }
      return ok({ ok: true });
    }
    case "leave": {
      if (isOwner) throw new HttpError(400, "Owners can't leave. Delete the project instead.");
      await db.projectMember.deleteMany({ where: { projectId: id, userId: user.id } });
      const convo = await db.conversation.findFirst({ where: { kind: "project", projectId: id } });
      if (convo) await db.conversationMember.deleteMany({ where: { conversationId: convo.id, userId: user.id } });
      return ok({ ok: true });
    }
  }
  throw new HttpError(404, "Unknown action");
});
