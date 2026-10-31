import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const me = await requireUser();
  const items = await db.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { actor: { select: { name: true, image: true, username: true } } },
  });
  return (
    <div className="mx-auto max-w-[720px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader title="Notifications" subtitle="Matches, messages, invites and more" accent="orange" icon={Bell} />
      <NotificationCenter
        initial={items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, read: Boolean(n.readAt), createdAt: n.createdAt.toISOString(), actor: n.actor }))}
      />
    </div>
  );
}
