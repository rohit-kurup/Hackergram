import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell me={{ id: user.id, name: user.name, username: user.username, image: user.image, githubUsername: user.githubUsername }}>
      {children}
    </AppShell>
  );
}
