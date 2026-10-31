import { db } from "@/lib/db";
import { authed, ok, parseBody } from "@/lib/api";
import { toList } from "@/lib/json";
import { projectSchema } from "@/lib/validation";

export const POST = authed(
  async (req, { user }) => {
    const body = await parseBody(req, projectSchema);
    const { tech, rolesNeeded, requiredSkills, thumbnail, ...rest } = body;
    const project = await db.project.create({
      data: {
        ...rest,
        ownerId: user.id,
        thumbnail: thumbnail?.startsWith("/uploads/") ? thumbnail : null,
        tech: toList(tech),
        rolesNeeded: toList(rolesNeeded),
        requiredSkills: toList(requiredSkills),
        members: { create: { userId: user.id, role: "Founder" } },
      },
    });
    return ok({ id: project.id });
  },
  { limit: 10 },
);
