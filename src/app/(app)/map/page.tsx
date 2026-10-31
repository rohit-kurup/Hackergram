import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseList } from "@/lib/json";
import { MapExperience } from "@/components/map/MapExperience";

export const metadata = { title: "Hackathon Map" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const me = await requireUser();
  const { event } = await searchParams;
  const [events, mine] = await Promise.all([
    db.hackathon.findMany({
      where: {
        OR: [{ status: "approved" }, { submittedById: me.id }, ...(me.isAdmin ? [{ status: "pending" }] : [])],
        startsAt: { gte: new Date(Date.now() - 3 * 864e5) },
      },
      orderBy: { startsAt: "asc" },
      take: 300,
      include: { _count: { select: { attendance: true } } },
    }),
    db.eventAttendance.findMany({ where: { userId: me.id }, select: { hackathonId: true } }),
  ]);
  const going = new Set(mine.map((m) => m.hackathonId));
  return (
    <MapExperience
      initialSelected={event ?? null}
      isAdmin={me.isAdmin}
      me={{ lat: me.lat, lng: me.lng, location: me.location }}
      events={events.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        category: e.category,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt?.toISOString() ?? null,
        deadline: e.deadline?.toISOString() ?? null,
        city: e.city,
        venue: e.venue,
        university: e.university,
        lat: e.lat,
        lng: e.lng,
        isOnline: e.isOnline,
        organizer: e.organizer,
        prize: e.prize,
        prizeAmount: e.prizeAmount,
        website: e.website,
        skills: parseList(e.skills),
        beginnerFriendly: e.beginnerFriendly,
        participants: e.participants,
        source: e.source,
        verified: e.verified,
        status: e.status,
        hgCount: e._count.attendance,
        going: going.has(e.id),
      }))}
    />
  );
}
