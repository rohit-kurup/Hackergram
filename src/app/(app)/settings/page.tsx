import { Settings } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { githubConfigured } from "@/lib/github";
import { parseList, parseObj } from "@/lib/json";
import { DEFAULT_PRIVACY } from "@/lib/validation";
import { SettingsView } from "@/components/settings/SettingsView";
import { PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ github?: string; error?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const repoCount = await db.githubRepo.count({ where: { userId: me.id } });
  return (
    <div className="mx-auto max-w-[820px] px-4 py-5 md:px-8 md:py-8">
      <PageHeader title="Settings" subtitle="Your profile, privacy and connected accounts" accent="purple" icon={Settings} />
      <SettingsView
        flash={sp.github === "connected" ? "GitHub connected and synced 🎉" : sp.error === "github_linked_elsewhere" ? "That GitHub account is already linked to another Hackergram account." : null}
        githubConfigured={githubConfigured()}
        hasPassword={Boolean(me.passwordHash)}
        github={{ username: me.githubUsername, syncedAt: me.githubSyncedAt?.toISOString() ?? null, scopes: me.githubScopes, repoCount }}
        privacy={parseObj(me.privacy, DEFAULT_PRIVACY)}
        profile={{
          name: me.name, username: me.username, email: me.email, headline: me.headline, bio: me.bio, location: me.location, lat: me.lat, lng: me.lng,
          university: me.university, major: me.major, gradYear: me.gradYear, company: me.company, languages: parseList(me.languages),
          technologies: parseList(me.technologies), interests: parseList(me.interests), projectTypes: parseList(me.projectTypes),
          lookingForCollab: me.lookingForCollab, openToHackathons: me.openToHackathons, availability: me.availability, accent: me.accent as any,
        }}
      />
    </div>
  );
}
