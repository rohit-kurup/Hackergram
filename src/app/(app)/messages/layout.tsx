import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/messages";
import { ConversationList } from "@/components/messages/ConversationList";

export const metadata = { title: "Messages" };

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const conversations = await listConversations(me.id);
  return (
    <div className="mx-auto flex h-[calc(100dvh-61px-96px)] max-w-[1180px] md:h-screen md:px-6 md:py-6">
      <div className="flex w-full overflow-hidden md:rounded-4xl md:bg-white md:shadow-card md:ring-1 md:ring-paper-line">
        <ConversationList initial={conversations} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
