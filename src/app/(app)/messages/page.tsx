import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/primitives";

export default function MessagesIndex() {
  return (
    <div className="hidden h-full items-center justify-center bg-paper-off/50 md:flex">
      <EmptyState icon={MessageCircle} accent="cyan" title="Your messages" body="Pick a conversation, or match with someone to start one. Project teams get a group chat automatically." />
    </div>
  );
}
