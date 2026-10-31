/**
 * Seeds clearly-labeled SAMPLE data so Hackergram is explorable before real users join.
 * Every seeded person has isSample=true and every seeded event has source="sample";
 * the UI shows a "Sample" badge on both. Names and events are fictional.
 *
 *   npm run db:seed     (idempotent: wipes previous sample data first)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const L = (a: string[]) => JSON.stringify(a);
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 864e5 - h * 3600e3);
const daysFromNow = (d: number) => new Date(Date.now() + d * 864e5);

function calendar(seed: number, intensity: number) {
  const out: { date: string; count: number }[] = [];
  let x = seed;
  for (let i = 364; i >= 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    const d = new Date(Date.now() - i * 864e5);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const count = r < 0.35 ? 0 : Math.floor(r * intensity * (weekend ? 1.4 : 1));
    out.push({ date: d.toISOString().slice(0, 10), count });
  }
  return out;
}

const PEOPLE = [
  { name: "Priya Raman", u: "priya.builds", uni: "The University of Texas at Austin", major: "Computer Science", year: 2026, city: "Austin, TX", lat: 30.28, lng: -97.74, headline: "ML @ UT · making LLMs useful for students", co: "ML Research Intern @ UT NLP Lab", langs: ["Python", "Rust", "TypeScript"], tech: ["PyTorch", "FastAPI", "Next.js", "Hugging Face"], interests: ["AI / ML", "EdTech", "Open Source"], types: ["AI / ML", "Web"], avail: "Weekends", accent: "coral", intensity: 9 },
  { name: "Marcus Chen", u: "marcuschen", uni: "The University of Texas at Austin", major: "Electrical & Computer Engineering", year: 2027, city: "Austin, TX", lat: 30.29, lng: -97.73, headline: "Hardware hacker · embedded Rust · robots that wave back", co: "", langs: ["C", "C++", "Rust", "Python"], tech: ["Arduino", "Raspberry Pi", "OpenCV"], interests: ["Hardware", "Robotics", "Climate"], types: ["Hardware", "AI / ML"], avail: "Evenings", accent: "orange", intensity: 6 },
  { name: "Sofia Alvarez", u: "sofia.design", uni: "Rice University", major: "Design + CS", year: 2026, city: "Houston, TX", lat: 29.72, lng: -95.4, headline: "Designer who ships · Figma → React in an afternoon", co: "Product Design Intern @ a fintech startup", langs: ["TypeScript", "JavaScript"], tech: ["React", "Figma", "Tailwind CSS", "Framer Motion", "Next.js"], interests: ["Design", "Social Impact", "Health Tech"], types: ["Web", "Mobile"], avail: "Weekends", accent: "purple", intensity: 5 },
  { name: "Jamal Wright", u: "jamalw", uni: "Georgia Tech", major: "Computer Science", year: 2025, city: "Atlanta, GA", lat: 33.77, lng: -84.4, headline: "Backend + infra · I make things fast and boring (in a good way)", co: "SWE @ a payments company", langs: ["Go", "TypeScript", "SQL"], tech: ["PostgreSQL", "Kubernetes", "Redis", "Docker", "GraphQL"], interests: ["Developer Tools", "Fintech", "Open Source"], types: ["Dev Tools", "Web"], avail: "A few hours/week", accent: "blue", intensity: 8 },
  { name: "Aiko Tanaka", u: "aiko.t", uni: "University of Waterloo", major: "Software Engineering", year: 2026, city: "Waterloo, ON", lat: 43.47, lng: -80.54, headline: "Mobile-first · SwiftUI & Kotlin · 3x hackathon winner", co: "iOS Intern", langs: ["Swift", "Kotlin", "TypeScript"], tech: ["SwiftUI", "React Native", "Firebase"], interests: ["Health Tech", "Music Tech", "Design"], types: ["Mobile", "Games"], avail: "Hackathons only", accent: "cyan", intensity: 7 },
  { name: "Diego Morales", u: "diegom", uni: "UC Berkeley", major: "Data Science", year: 2027, city: "Berkeley, CA", lat: 37.87, lng: -122.26, headline: "Data viz nerd · turning messy CSVs into stories", co: "", langs: ["Python", "R", "SQL", "JavaScript"], tech: ["Pandas", "D3", "Supabase", "Next.js"], interests: ["Data Science", "Climate", "Social Impact"], types: ["Data", "Web"], avail: "Weekends", accent: "green", intensity: 5 },
  { name: "Hannah Okafor", u: "hannah.ok", uni: "Carnegie Mellon University", major: "Computer Science", year: 2026, city: "Pittsburgh, PA", lat: 40.44, lng: -79.94, headline: "Security & systems · CTF captain · breaking things responsibly", co: "Security Intern", langs: ["C", "Rust", "Python", "Go"], tech: ["Docker", "AWS", "Linux"], interests: ["Security", "Open Source", "Developer Tools"], types: ["Dev Tools", "Research"], avail: "Evenings", accent: "purple", intensity: 8 },
  { name: "Leo Park", u: "leopark", uni: "Stanford University", major: "Symbolic Systems", year: 2027, city: "Palo Alto, CA", lat: 37.43, lng: -122.17, headline: "Founder-curious · building agents that book your study rooms", co: "", langs: ["TypeScript", "Python"], tech: ["Next.js", "LangChain", "Supabase", "Vercel"], interests: ["Startups", "AI / ML", "EdTech"], types: ["AI / ML", "Web"], avail: "Full-time this month", accent: "coral", intensity: 7 },
  { name: "Fatima Zahra", u: "fatima.codes", uni: "University of Toronto", major: "Engineering Science", year: 2026, city: "Toronto, ON", lat: 43.66, lng: -79.39, headline: "Computer vision for accessibility · ex-GSoC", co: "Research Assistant", langs: ["Python", "C++"], tech: ["PyTorch", "OpenCV", "FastAPI"], interests: ["AI / ML", "Social Impact", "Health Tech"], types: ["AI / ML", "Research"], avail: "Weekends", accent: "yellow", intensity: 6 },
  { name: "Noah Fischer", u: "noahf", uni: "Texas A&M University", major: "Computer Engineering", year: 2025, city: "College Station, TX", lat: 30.62, lng: -96.34, headline: "Game dev & graphics · Three.js · Godot · shaders", co: "", langs: ["C#", "TypeScript", "C++"], tech: ["Unity", "Three.js", "React"], interests: ["Games", "AR / VR", "Design"], types: ["Games", "Web"], avail: "Evenings", accent: "orange", intensity: 4 },
  { name: "Ananya Iyer", u: "ananya.i", uni: "The University of Texas at Austin", major: "Computer Science & Business", year: 2027, city: "Austin, TX", lat: 30.27, lng: -97.75, headline: "PM brain, engineer hands · fintech for students", co: "PM Intern @ a neobank", langs: ["TypeScript", "Python", "SQL"], tech: ["Next.js", "Prisma", "PostgreSQL", "Tailwind CSS"], interests: ["Fintech", "Startups", "EdTech"], types: ["Web", "Mobile"], avail: "Weekends", accent: "blue", intensity: 5 },
  { name: "Ethan Brooks", u: "ethanb", uni: "University of Michigan", major: "Computer Science", year: 2026, city: "Ann Arbor, MI", lat: 42.28, lng: -83.74, headline: "Web3 skeptic who still writes Solidity · ZK curious", co: "", langs: ["Solidity", "TypeScript", "Rust"], tech: ["Node.js", "React", "GraphQL"], interests: ["Web3", "Security", "Fintech"], types: ["Web3", "Dev Tools"], avail: "A few hours/week", accent: "cyan", intensity: 6 },
  { name: "Grace Liu", u: "grace.liu", uni: "MIT", major: "EECS", year: 2026, city: "Cambridge, MA", lat: 42.36, lng: -71.09, headline: "Robotics + RL · teaching robot arms to fold laundry", co: "Robotics Intern", langs: ["Python", "C++", "Julia"], tech: ["PyTorch", "ROS", "Docker"], interests: ["Robotics", "AI / ML", "Hardware"], types: ["Research", "Hardware"], avail: "Weekends", accent: "green", intensity: 9 },
  { name: "Omar Haddad", u: "omarh", uni: "UT Dallas", major: "Software Engineering", year: 2025, city: "Dallas, TX", lat: 32.99, lng: -96.75, headline: "Full-stack · Django + React · loves a good README", co: "SWE Intern @ an airline", langs: ["Python", "JavaScript", "TypeScript"], tech: ["Django", "React", "PostgreSQL", "AWS"], interests: ["Open Source", "Developer Tools", "Climate"], types: ["Web", "Open Source"], avail: "Evenings", accent: "purple", intensity: 5 },
];

const PROJECTS: { owner: string; title: string; tagline: string; desc: string; tech: string[]; cat: string; color: string; stars: number; listing?: { roles: string[]; skills: string[]; size: number; stage: string; commit: string; remote: boolean; beginner: boolean; location?: string } }[] = [
  { owner: "priya.builds", title: "StudyBuddy", tagline: "Turns lecture slides into spaced-repetition quizzes", desc: "Upload slides, get flashcards and practice questions grounded in the actual content. Built with a RAG pipeline and a tiny fine-tuned model.", tech: ["Python", "FastAPI", "Next.js", "PyTorch"], cat: "AI / ML", color: "coral", stars: 214 },
  { owner: "priya.builds", title: "MedLens", tagline: "AI-assisted medical imaging triage for rural clinics", desc: "We're building an assistant that flags chest X-rays for radiologist review. Looking for teammates to take it from prototype to a pilot.", tech: ["PyTorch", "FastAPI", "React"], cat: "AI / ML", color: "blue", stars: 38, listing: { roles: ["Frontend developer", "ML engineer", "Backend developer"], skills: ["React", "PyTorch", "FastAPI", "TypeScript"], size: 5, stage: "Prototype", commit: "8-10 hrs/week", remote: true, beginner: false } },
  { owner: "marcuschen", title: "WaveBot", tagline: "A desk robot that waves when your CI passes", desc: "ESP32 + servo + GitHub webhooks. Way more satisfying than a green checkmark.", tech: ["C++", "Arduino", "Rust"], cat: "Hardware", color: "orange", stars: 96 },
  { owner: "sofia.design", title: "Bloom", tagline: "A gentle mood journal with beautiful weekly recaps", desc: "Privacy-first, local storage by default. Looking for a mobile dev to bring it to iOS.", tech: ["React", "Framer Motion", "Tailwind CSS"], cat: "Mobile", color: "purple", stars: 61, listing: { roles: ["iOS developer", "Backend developer"], skills: ["SwiftUI", "React Native", "Supabase"], size: 3, stage: "MVP", commit: "5 hrs/week", remote: true, beginner: true } },
  { owner: "jamalw", title: "pgpulse", tagline: "A tiny CLI that tells you which Postgres queries are hurting", desc: "Reads pg_stat_statements and prints a ranked, human-friendly report.", tech: ["Go", "PostgreSQL"], cat: "Dev Tools", color: "blue", stars: 1203 },
  { owner: "aiko.t", title: "Tempo", tagline: "Practice music with a metronome that listens back", desc: "Real-time pitch and timing feedback on-device. Won 1st at a 36-hour hackathon.", tech: ["Swift", "SwiftUI"], cat: "Mobile", color: "cyan", stars: 342 },
  { owner: "diegom", title: "Heatmap the Bay", tagline: "Urban heat islands, block by block", desc: "Open data + satellite imagery to show where trees would help most.", tech: ["Python", "D3", "Next.js"], cat: "Data", color: "green", stars: 87, listing: { roles: ["Frontend developer", "GIS / data person"], skills: ["D3", "React", "Python"], size: 4, stage: "Prototype", commit: "Weekends", remote: false, beginner: true, location: "Berkeley, CA" } },
  { owner: "hannah.ok", title: "ctf-kit", tagline: "Batteries-included toolkit for running campus CTFs", desc: "Challenge templates, scoreboard, and Docker-isolated challenge hosting.", tech: ["Go", "Docker", "Python"], cat: "Dev Tools", color: "purple", stars: 455 },
  { owner: "leopark", title: "RoomAgent", tagline: "An agent that books study rooms so you don't have to", desc: "Calendar-aware, polite, and absolutely ruthless at 12:00:01am. Seeking a backend dev and a designer.", tech: ["TypeScript", "Next.js", "LangChain"], cat: "AI / ML", color: "coral", stars: 29, listing: { roles: ["Backend developer", "Product designer"], skills: ["Node.js", "TypeScript", "Figma"], size: 3, stage: "Idea", commit: "10+ hrs/week", remote: true, beginner: false } },
  { owner: "fatima.codes", title: "SignSight", tagline: "Real-time ASL fingerspelling recognition in the browser", desc: "On-device inference with a lightweight CNN. Accessibility first.", tech: ["Python", "PyTorch", "OpenCV"], cat: "AI / ML", color: "yellow", stars: 512 },
  { owner: "noahf", title: "Pixel Garden", tagline: "A cozy multiplayer garden in your browser", desc: "Three.js + websockets. Plant seeds with friends, watch them grow in real time.", tech: ["Three.js", "TypeScript"], cat: "Games", color: "green", stars: 74, listing: { roles: ["Pixel artist", "Backend developer"], skills: ["Node.js", "Three.js"], size: 3, stage: "Prototype", commit: "Evenings", remote: true, beginner: true } },
  { owner: "ananya.i", title: "SplitCampus", tagline: "Split bills across student orgs without the spreadsheet", desc: "Venmo-friendly settlement graphs with treasurer exports.", tech: ["Next.js", "Prisma", "PostgreSQL"], cat: "Web", color: "blue", stars: 45 },
  { owner: "grace.liu", title: "FoldNet", tagline: "Teaching robot arms to fold laundry with RL", desc: "Sim-to-real transfer for deformable objects. Paper in progress.", tech: ["Python", "PyTorch", "C++"], cat: "AI / ML", color: "green", stars: 230 },
  { owner: "omarh", title: "readme-doctor", tagline: "Lints your README and suggests what's missing", desc: "Badges, setup steps, license, screenshots: it nags so your users don't have to.", tech: ["Python", "Django"], cat: "Dev Tools", color: "purple", stars: 167 },
];

const EVENTS = [
  { name: "Lone Star Build Weekend", city: "Austin, TX", uni: "The University of Texas at Austin", lat: 30.2849, lng: -97.7341, d: 12, cat: "hackathon", prize: "$15,000 in prizes", amt: 15000, beginner: true, n: 600, skills: ["Web", "AI / ML", "Hardware"], org: "Sample Org" },
  { name: "Gulf Coast Hacks", city: "Houston, TX", uni: "Rice University", lat: 29.7174, lng: -95.4018, d: 26, cat: "hackathon", prize: "$8,000 + internships", amt: 8000, beginner: true, n: 350, skills: ["Health Tech", "Data"], org: "Sample Org" },
  { name: "Austin AI Builders Meetup", city: "Austin, TX", uni: "", lat: 30.2672, lng: -97.7431, d: 5, cat: "meetup", prize: "", amt: 0, beginner: true, n: 80, skills: ["AI / ML"], org: "Sample Org" },
  { name: "Bay Area Climate Hack", city: "Berkeley, CA", uni: "UC Berkeley", lat: 37.8719, lng: -122.2585, d: 40, cat: "hackathon", prize: "$20,000 in prizes", amt: 20000, beginner: false, n: 500, skills: ["Climate", "Data", "Hardware"], org: "Sample Org" },
  { name: "Northeast Systems Cup", city: "Cambridge, MA", uni: "MIT", lat: 42.3601, lng: -71.0942, d: 33, cat: "competition", prize: "$5,000", amt: 5000, beginner: false, n: 120, skills: ["Systems", "Security"], org: "Sample Org" },
  { name: "Founders & Coders Night", city: "San Francisco, CA", uni: "", lat: 37.7793, lng: -122.4193, d: 9, cat: "startup", prize: "", amt: 0, beginner: true, n: 150, skills: ["Startups"], org: "Sample Org" },
  { name: "Remote Open Source Sprint", city: "", uni: "", lat: null, lng: null, d: 18, cat: "hackathon", prize: "Swag + mentorship", amt: 0, beginner: true, n: 1200, skills: ["Open Source", "Dev Tools"], org: "Sample Org", online: true },
  { name: "Great Lakes DevConf", city: "Chicago, IL", uni: "", lat: 41.8826, lng: -87.6233, d: 55, cat: "conference", prize: "", amt: 0, beginner: true, n: 900, skills: ["Web", "Cloud"], org: "Sample Org" },
  { name: "Maple Hacks", city: "Waterloo, ON", uni: "University of Waterloo", lat: 43.4723, lng: -80.5449, d: 21, cat: "hackathon", prize: "$10,000 CAD", amt: 7500, beginner: true, n: 700, skills: ["Mobile", "AI / ML"], org: "Sample Org" },
  { name: "Aggie Robotics Jam", city: "College Station, TX", uni: "Texas A&M University", lat: 30.6187, lng: -96.3365, d: 30, cat: "competition", prize: "$3,000", amt: 3000, beginner: false, n: 90, skills: ["Hardware", "Robotics"], org: "Sample Org" },
];

const POSTS: { u: string; kind: string; content: string; h: number; project?: string; event?: string; repo?: { fullName: string; description: string; stars: number; forks: number; language: string } }[] = [
  { u: "priya.builds", kind: "collab", content: "MedLens is moving from notebook to real product 🩻 Looking for a frontend dev who loves clean dashboards and an ML engineer comfortable with PyTorch. Remote friendly, ~8 hrs/week. DM me!", h: 3, project: "MedLens" },
  { u: "jamalw", kind: "repo", content: "pgpulse just crossed 1.2k stars 🎉 Thank you all. v0.9 adds a --since flag so you can diff query costs before and after a deploy.", h: 6, repo: { fullName: "jamalw/pgpulse", description: "A tiny CLI that tells you which Postgres queries are hurting", stars: 1203, forks: 58, language: "Go" } },
  { u: "aiko.t", kind: "hackathon", content: "36 hours, 4 energy drinks, 1 working metronome that listens back. Tempo took 1st place this weekend! Huge thanks to my teammates 💙 Writing up a postmortem soon.", h: 20, project: "Tempo" },
  { u: "sofia.design", kind: "update", content: "Hot take: your hackathon demo needs ONE screen that makes people go 'ooh'. Spend the last 2 hours there, not on the settings page. ✨", h: 9 },
  { u: "hannah.ok", kind: "question", content: "For folks running campus CTFs: how are you isolating challenge containers? We're on Docker + gVisor but cold starts are rough. Firecracker worth the setup pain?", h: 14 },
  { u: "marcuschen", kind: "project", content: "Built a desk robot that waves when CI passes. Is it useful? No. Does it spark joy? Absolutely. 🤖👋", h: 30, project: "WaveBot" },
  { u: "leopark", kind: "collab", content: "Idea-stage but committed: RoomAgent books study rooms so you never fight the 12am rush again. Need a backend dev + a designer. Austin or remote 🙌", h: 26, project: "RoomAgent" },
  { u: "diegom", kind: "project", content: "Mapped urban heat islands across the East Bay using open satellite data. The difference a few trees make is wild: up to 6°C on some blocks 🌳", h: 40, project: "Heatmap the Bay" },
  { u: "fatima.codes", kind: "update", content: "SignSight now runs at 30fps entirely in the browser. No server, no data leaves your device. Accessibility tools should be private by default.", h: 50, project: "SignSight" },
  { u: "noahf", kind: "question", content: "Three.js folks: what's your go-to for syncing state over websockets without everything turning into spaghetti? Considering Colyseus.", h: 60 },
  { u: "ananya.i", kind: "hackathon", content: "Who's going to Lone Star Build Weekend? Looking for 1-2 more people for a fintech-for-students idea. I do product + full-stack.", h: 4, event: "Lone Star Build Weekend" },
  { u: "omarh", kind: "update", content: "PSA: a good README is the cheapest marketing you'll ever do. Screenshot at the top, one-line install, done. readme-doctor will nag you if you forget 😄", h: 72, project: "readme-doctor" },
  { u: "grace.liu", kind: "project", content: "FoldNet folded its first towel in the real world after training only in sim. It took 4 minutes. It was beautiful. 🧺🤖", h: 85, project: "FoldNet" },
  { u: "ethanb", kind: "question", content: "Is anyone using ZK proofs for something that isn't crypto? Looking for project ideas for a class: privacy-preserving age checks maybe?", h: 95 },
];

async function main() {
  console.log("Clearing previous sample data…");
  await db.user.deleteMany({ where: { OR: [{ isSample: true }, { email: "demo@hackergram.dev" }] } });
  await db.hackathon.deleteMany({ where: { source: "sample" } });

  console.log("Creating demo account…");
  const demo = await db.user.create({
    data: {
      email: "demo@hackergram.dev",
      passwordHash: await bcrypt.hash("demo1234", 12),
      name: "Alex Rivera",
      username: "demo",
      headline: "CS @ UT Austin · full-stack + curious about AI",
      bio: "This is the demo account. Swipe, post, message, and try the AI assistant. Everything here is sample data.",
      location: "Austin, TX",
      lat: 30.2672,
      lng: -97.7431,
      university: "The University of Texas at Austin",
      major: "Computer Science",
      gradYear: 2027,
      company: "",
      languages: L(["TypeScript", "Python", "Go"]),
      technologies: L(["React", "Next.js", "PostgreSQL", "Tailwind CSS"]),
      interests: L(["AI / ML", "Developer Tools", "Startups"]),
      projectTypes: L(["Web", "AI / ML"]),
      availability: "Weekends",
      accent: "purple",
      onboarded: true,
      isSample: true,
      isAdmin: true,
    },
  });
  await db.education.create({ data: { userId: demo.id, school: "The University of Texas at Austin", degree: "B.S.", field: "Computer Science", startYear: 2023, endYear: 2027 } });
  await db.project.create({
    data: { ownerId: demo.id, title: "campus-eats", tagline: "Find the cheapest late-night food near campus", description: "A Next.js app that aggregates menus and hours from campus-area restaurants.", tech: L(["TypeScript", "Next.js", "PostgreSQL"]), category: "Web", color: "orange", stars: 12, pinned: true },
  });

  console.log("Creating sample builders…");
  const users: Record<string, string> = {};
  for (const [i, p] of PEOPLE.entries()) {
    const cal = calendar(i * 7919 + 13, p.intensity);
    const total = cal.reduce((s, d) => s + d.count, 0);
    const u = await db.user.create({
      data: {
        email: `${p.u.replace(/\./g, "")}@sample.hackergram.dev`,
        name: p.name,
        username: p.u,
        headline: p.headline,
        bio: `${p.headline}. (Sample profile for demo purposes.)`,
        location: p.city,
        lat: p.lat,
        lng: p.lng,
        university: p.uni,
        major: p.major,
        gradYear: p.year,
        company: p.co,
        languages: L(p.langs),
        technologies: L(p.tech),
        interests: L(p.interests),
        projectTypes: L(p.types),
        availability: p.avail,
        accent: p.accent,
        onboarded: true,
        isSample: true,
        lastSeenAt: daysAgo(0, i % 4 === 0 ? 0 : i),
        githubStats: JSON.stringify({
          sample: true,
          followers: 20 + i * 17,
          publicRepos: 8 + i * 3,
          totalStars: 50 + i * 90,
          totalContributions: total,
          commits: Math.round(total * 0.7),
          pullRequests: Math.round(total * 0.08),
          mergedPullRequests: Math.round(total * 0.06),
          issues: Math.round(total * 0.04),
          languageBytes: Object.fromEntries(p.langs.map((l, j) => [l, Math.round(100000 / (j + 1))])),
          calendar: cal,
          limitations: ["Sample profile: these statistics are illustrative, not from a real GitHub account."],
        }),
      },
    });
    users[p.u] = u.id;
    await db.education.create({ data: { userId: u.id, school: p.uni, degree: "B.S.", field: p.major, startYear: p.year - 4, endYear: p.year } });
    if (p.co) await db.experience.create({ data: { userId: u.id, kind: "internship", title: p.co.split(" @ ")[0]!, org: p.co.split(" @ ")[1] ?? "Undisclosed", start: "Summer 2025", end: "", current: true } });
  }
  users["demo"] = demo.id;

  console.log("Creating projects…");
  const projectIds: Record<string, string> = {};
  for (const p of PROJECTS) {
    const pr = await db.project.create({
      data: {
        ownerId: users[p.owner]!,
        title: p.title,
        tagline: p.tagline,
        description: p.desc,
        tech: L(p.tech),
        category: p.cat,
        color: p.color,
        stars: p.stars,
        forks: Math.round(p.stars / 12),
        pinned: true,
        ...(p.listing && {
          isListing: true,
          rolesNeeded: L(p.listing.roles),
          requiredSkills: L(p.listing.skills),
          teamSize: p.listing.size,
          stage: p.listing.stage,
          commitment: p.listing.commit,
          remote: p.listing.remote,
          beginnerFriendly: p.listing.beginner,
          location: p.listing.location ?? "",
        }),
      },
    });
    projectIds[p.title] = pr.id;
    await db.projectMember.create({ data: { projectId: pr.id, userId: users[p.owner]!, role: "Founder" } });
  }
  await db.projectMember.create({ data: { projectId: projectIds["MedLens"]!, userId: users["fatima.codes"]!, role: "ML engineer" } });
  await db.projectMember.create({ data: { projectId: projectIds["Heatmap the Bay"]!, userId: users["omarh"]!, role: "Backend" } });

  console.log("Creating sample events…");
  const eventIds: Record<string, string> = {};
  for (const e of EVENTS) {
    const ev = await db.hackathon.create({
      data: {
        name: e.name,
        description: `${e.name} is a sample event seeded for demo purposes. Build something amazing over a weekend with mentors, workshops, and great food.`,
        category: e.cat,
        startsAt: daysFromNow(e.d),
        endsAt: daysFromNow(e.d + (e.cat === "hackathon" ? 2 : 0)),
        deadline: daysFromNow(Math.max(1, e.d - 5)),
        city: e.city,
        venue: e.uni || e.city,
        university: e.uni,
        lat: e.lat,
        lng: e.lng,
        isOnline: Boolean((e as any).online),
        organizer: e.org,
        prize: e.prize,
        prizeAmount: e.amt,
        website: "https://example.com",
        skills: L(e.skills),
        themes: L(e.skills),
        beginnerFriendly: e.beginner,
        participants: e.n,
        source: "sample",
        status: "approved",
        verified: false,
      },
    });
    eventIds[e.name] = ev.id;
  }
  for (const u of ["priya.builds", "marcuschen", "ananya.i", "noahf", "omarh"]) {
    await db.eventAttendance.create({ data: { userId: users[u]!, hackathonId: eventIds["Lone Star Build Weekend"]!, lookingForTeam: u !== "marcuschen" } });
  }
  await db.eventAttendance.create({ data: { userId: users["diegom"]!, hackathonId: eventIds["Bay Area Climate Hack"]! } });
  await db.eventAttendance.create({ data: { userId: users["aiko.t"]!, hackathonId: eventIds["Maple Hacks"]! } });

  console.log("Creating posts, comments, likes…");
  const postIds: string[] = [];
  for (const p of POSTS) {
    const post = await db.post.create({
      data: {
        authorId: users[p.u]!,
        kind: p.kind,
        content: p.content,
        createdAt: daysAgo(0, p.h),
        projectId: p.project ? projectIds[p.project] : null,
        hackathonId: p.event ? eventIds[p.event] : null,
        repoUrl: p.repo ? `https://github.com/${p.repo.fullName}` : null,
        repoPreview: p.repo ? JSON.stringify({ ...p.repo, url: `https://github.com/${p.repo.fullName}`, verified: false }) : null,
      },
    });
    postIds.push(post.id);
  }
  const all = Object.values(users).filter((id) => id !== demo.id);
  for (const [i, pid] of postIds.entries()) {
    const likers = all.filter((_, j) => (i + j) % 3 !== 0).slice(0, 4 + (i % 8));
    for (const uid of likers) await db.like.create({ data: { postId: pid, userId: uid } }).catch(() => {});
  }
  const comments: [number, string, string][] = [
    [0, "hannah.ok", "This is such a good use of ML. Happy to help with security review of the upload pipeline!"],
    [0, "sofia.design", "I'd love to help on the dashboard side 👀"],
    [1, "omarh", "Been using this at work, the --since flag is exactly what I needed."],
    [2, "sofia.design", "Congrats!! The UI on Tempo is gorgeous"],
    [4, "jamalw", "Firecracker is worth it if you have >50 challenges. Otherwise gVisor + a warm pool works fine."],
    [10, "priya.builds", "I'll be there! Let's chat 🙌"],
  ];
  for (const [idx, u, text] of comments) {
    await db.comment.create({ data: { postId: postIds[idx]!, authorId: users[u]!, content: text, createdAt: daysAgo(0, POSTS[idx]!.h - 1) } });
  }

  console.log("Creating follows, swipes, a match and conversations…");
  const follows: [string, string][] = [
    ["demo", "priya.builds"], ["demo", "jamalw"], ["demo", "sofia.design"],
    ["priya.builds", "demo"], ["ananya.i", "demo"], ["leopark", "demo"],
    ["priya.builds", "fatima.codes"], ["jamalw", "hannah.ok"], ["sofia.design", "aiko.t"], ["marcuschen", "grace.liu"],
  ];
  for (const [a, b] of follows) await db.follow.create({ data: { followerId: users[a]!, followingId: users[b]! } });

  // These sample builders have already swiped right on the demo user, so
  // swiping right on them in Match creates a real mutual match.
  for (const u of ["ananya.i", "leopark", "marcuschen", "omarh", "sofia.design"]) {
    await db.swipe.create({ data: { swiperId: users[u]!, targetId: demo.id, direction: u === "leopark" ? "super" : "right" } });
  }

  // One existing match + conversation so Messages isn't empty.
  const convo = await db.conversation.create({
    data: {
      kind: "direct",
      members: { create: [{ userId: demo.id, lastReadAt: daysAgo(1) }, { userId: users["priya.builds"]!, lastReadAt: daysAgo(0) }] },
    },
  });
  const [a, b] = [demo.id, users["priya.builds"]!].sort();
  await db.match.create({ data: { userAId: a!, userBId: b!, conversationId: convo.id, createdAt: daysAgo(2) } });
  await db.swipe.create({ data: { swiperId: demo.id, targetId: users["priya.builds"]!, direction: "right", createdAt: daysAgo(2) } });
  await db.swipe.create({ data: { swiperId: users["priya.builds"]!, targetId: demo.id, direction: "right", createdAt: daysAgo(2) } });
  const msgs: [string, string, number][] = [
    ["priya.builds", "Hey! We matched 🎉 I saw you're into Next.js. Would you be up for helping on the MedLens dashboard?", 47],
    ["demo", "Absolutely! What does the current frontend look like?", 46],
    ["priya.builds", "Honestly just a Streamlit prototype 😅 Here's the repo so far:", 45],
    ["priya.builds", "Also, are you going to Lone Star Build Weekend? We could team up there.", 2],
  ];
  for (const [u, content, h] of msgs) {
    await db.message.create({ data: { conversationId: convo.id, senderId: users[u]!, content, createdAt: daysAgo(0, h) } });
  }

  const group = await db.conversation.create({
    data: {
      kind: "project",
      title: "MedLens team",
      projectId: projectIds["MedLens"],
      members: { create: [{ userId: demo.id }, { userId: users["priya.builds"]! }, { userId: users["fatima.codes"]! }] },
    },
  });
  await db.message.create({ data: { conversationId: group.id, senderId: users["fatima.codes"]!, content: "Pushed the new augmentation pipeline: val AUC is up 3 points 📈", createdAt: daysAgo(0, 5) } });

  const notifs = [
    { type: "match", title: "You matched with Priya Raman!", body: "You both love AI / ML and TypeScript.", href: "/messages", actor: "priya.builds", h: 47 },
    { type: "follow", title: "Ananya Iyer started following you", href: "/u/ananya.i", actor: "ananya.i", h: 10 },
    { type: "like", title: "Leo Park liked your project campus-eats", href: "/u/demo", actor: "leopark", h: 8 },
    { type: "collab", title: "Leo Park wants to collaborate on RoomAgent", body: "\"Your Next.js experience would be perfect for this.\"", href: `/projects/${projectIds["RoomAgent"]}`, actor: "leopark", h: 6 },
    { type: "reminder", title: "Lone Star Build Weekend starts in 12 days", body: "Registration closes in a week.", href: `/map?event=${eventIds["Lone Star Build Weekend"]}`, h: 1 },
  ];
  for (const n of notifs) {
    await db.notification.create({ data: { userId: demo.id, actorId: n.actor ? users[n.actor] : null, type: n.type, title: n.title, body: n.body ?? "", href: n.href, createdAt: daysAgo(0, n.h) } });
  }

  console.log("✅ Seed complete. Use \"Explore with the demo account\" on the login page.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
