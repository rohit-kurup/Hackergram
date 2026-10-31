import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDeck } from "@/lib/deck";
import { MatchExperience } from "@/components/match/MatchExperience";

export const metadata = { title: "Match" };

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const me = await requireUser();
  const { project } = await searchParams;
  const [deck, listings, matches] = await Promise.all([
    buildDeck(me, project || "global"),
    db.project.findMany({ where: { ownerId: me.id }, select: { id: true, title: true, isListing: true }, orderBy: { updatedAt: "desc" } }),
    db.match.findMany({
      where: { OR: [{ userAId: me.id }, { userBId: me.id }] },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { userA: { select: { id: true, name: true, image: true } }, userB: { select: { id: true, name: true, image: true } } },
    }),
  ]);
  return (
    <MatchExperience
      initialCards={deck.cards}
      initialContext={deck.project ? deck.project.id : "global"}
      projects={listings}
      me={{ name: me.name, image: me.image }}
      matches={matches.map((m) => {
        const other = m.userAId === me.id ? m.userB : m.userA;
        return { id: m.id, conversationId: m.conversationId, user: other };
      })}
    />
  );
}
