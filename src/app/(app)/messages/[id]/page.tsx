import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeMessage } from "@/lib/messages";
import { ChatThread } from "@/components/messages/ChatThread";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const convo = await db.conversation.findFirst({
    where: { id, members: { some: { userId: me.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, username: true, image: true, headline: true, lastSeenAt: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 60, include: { sender: { select: { name: true, image: true, username: true } } } },
    },
  });
  if (!convo) notFound();
  await db.conversationMember.updateMany({ where: { conversationId: id, userId: me.id }, data: { lastReadAt: new Date() } });
  const others = convo.members.filter((m) => m.userId !== me.id);
  const myProjects = await db.project.findMany({ where: { ownerId: me.id }, select: { id: true, title: true }, take: 20 });

  return (
    <ChatThread
      key={id}
      id={id}
      meId={me.id}
      kind={convo.kind}
      projectId={convo.projectId}
      title={convo.kind === "direct" ? others[0]?.user.name ?? "Conversation" : convo.title ?? "Group"}
      members={others.map((m) => ({ id: m.user.id, name: m.user.name, username: m.user.username, image: m.user.image, headline: m.user.headline, lastSeenAt: m.user.lastSeenAt.toISOString() }))}
      initialMessages={convo.messages.reverse().map(serializeMessage)}
      initialReads={Object.fromEntries(others.map((m) => [m.userId, m.lastReadAt.toISOString()]))}
      myProjects={myProjects}
    />
  );
}
