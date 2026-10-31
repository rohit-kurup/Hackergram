# Hackergram

**Don't just code alone. Find your people.**

Hackergram is a social network for people who build things: GitHub-powered portfolios, a social feed, swipe-to-match teammate discovery, project recruiting, messaging, a hackathon map, and a Gemma 4 AI assistant for hackathon applications.

## Quick start

Requires Node 20+ (tested on Node 22).

```bash
npm install
cp .env.example .env        # then fill APP_SECRET (see below)
npm run setup               # creates the SQLite DB and seeds sample data
npm run dev                 # http://localhost:3000
```

On the login page, click **Explore with the demo account** (available in development, or when `DEMO_MODE=true`). The demo account and every seeded person, project and event are **sample data**, marked with a "Sample" badge in the UI. Names and events are fictional.

Generate an `APP_SECRET` (used to encrypt OAuth tokens at rest):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Configuring integrations

Everything works without external keys. Features that need a key say so in the UI instead of pretending.

| Feature | Env vars | Without it |
| --- | --- | --- |
| GitHub sign-in & portfolio sync | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `APP_URL` | GitHub buttons are disabled with an explanation; email auth works |
| Gemma 4 AI | `GEMINI_API_KEY`, `GEMMA_MODEL` (or `AI_PROVIDER=openai-compatible` + `AI_BASE_URL`) | Apply with AI produces labeled fill-in-the-blank templates from your real profile; chat/tools show a setup notice |
| Map tiles | `NEXT_PUBLIC_MAP_TILE_URL` (optional) | Uses OpenStreetMap's standard tiles |

### GitHub OAuth

1. Go to https://github.com/settings/developers → **New OAuth App**.
2. Homepage URL: `http://localhost:3000`. Authorization callback URL: `http://localhost:3000/api/auth/github/callback`.
3. Copy the client ID and generate a client secret into `.env`.

Scopes requested: `read:user user:email` by default. `repo` (read private repos) is only requested when the user explicitly chooses "Include private repos". Tokens are encrypted with AES-256-GCM, never sent to the browser, and deleted on disconnect.

**What the sync retrieves:** profile, repositories (public, or private with `repo`), per-repo languages for the 15 most recently pushed repos, README excerpts for the top 6, the 12-month contribution calendar and totals (GraphQL `contributionsCollection`), merged PR count (search API), and recent events. **What it can't:** the Events API only covers ~90 days / 300 events, contribution totals cover the last year, and private contributions only appear if the user enabled that on GitHub. These limits are shown on every profile's GitHub tab.

### Gemma 4

Verified (Oct 2026): the Gemini API serves Gemma 4 as `gemma-4-26b-a4b-it` and `gemma-4-31b-it` via `models/{id}:generateContent`. Get a key at https://aistudio.google.com/apikey and set:

```env
AI_PROVIDER="gemini"
GEMINI_API_KEY="..."
GEMMA_MODEL="gemma-4-26b-a4b-it"
```

To self-host instead (Ollama, vLLM, LM Studio), point at any OpenAI-compatible endpoint running a Gemma 4 build:

```env
AI_PROVIDER="openai-compatible"
AI_BASE_URL="http://localhost:11434/v1"
GEMMA_MODEL="gemma4"
```

The model is never swapped silently; the UI always shows which model produced a result. Prompts include only labeled facts (`[GitHub]`, `[self-reported]`) and instruct the model to use `[ADD: …]` placeholders rather than invent anything.

## Features

- **Auth & onboarding:** email/password (bcrypt, DB-backed sessions in httpOnly cookies), GitHub OAuth sign-in or connect, password reset (link is shown on-page and logged in dev; plug an email provider into `/api/auth/forgot` for production), six-step animated onboarding.
- **Profiles:** portfolio grid with pinning, GitHub tab (stats, contribution heatmap, language donut, top repos, activity, API limitations), About (skills, education, experience, certifications), posts. Source labels distinguish GitHub data, user-entered data, and AI output. Per-field privacy controls.
- **Feed:** posts of six kinds, image upload (type and magic-byte checked), GitHub repo previews (private repos refused), likes, threaded comments, reposts, bookmarks, share, follow. Filters: For You (re-ranked by relevance and engagement), Following, Projects, Discussions, Local (150 km), Hackathons. Infinite scroll.
- **Hackergram Match:** draggable card stack with rotation, stamps, keyboard shortcuts, undo, Super Like, and a confetti match celebration. Mutual right swipes create a persisted `Match` plus a conversation. Scores are explainable (reasons shown on each card). Project mode swipes candidates ranked against a listing's required skills; a right swipe sends an invite.
- **Projects & teams:** showcase and recruiting listings (roles, skills, stage, commitment, remote, beginner-friendly), fit score, join requests, invites, accept/decline, remove/leave, mark full, recommended collaborators, AI description writer, automatic team group chat.
- **Messaging:** 1:1, group and project chats, image/repo/project-invite attachments, typing indicators, read receipts, online presence, unread badges. Delivery uses 2.5 s polling (see Scaling).
- **Hackathon map:** Leaflet map with category markers, list view, filters (distance, date, category, prize, online/in-person, beginner, search), attendance with "looking for team", teammate suggestions ranked by fit, Apply with AI, sharing. Events are labeled **Sample**, **Devpost** or **Community**. Community submissions require admin approval. Admins can import upcoming hackathons from Devpost's public listing (an undocumented endpoint, geocoded via Nominatim at ≤1 req/s).
- **AI studio:** Apply with AI (common questions, pasted form, or public form URL with SSRF protection), editable answers with sources and tips, copy-all; chat; tools (ideas, team composition, skill gap, prep plan, README, collaborator advice); AI developer snapshot on profiles; all outputs saved as editable drafts. Nothing is ever submitted on the user's behalf.
- **Notifications, Search & Explore, Settings:** notification center with filters and mark-read; universal search with autocomplete; trending builders/projects/technologies; profile editing, GitHub sync/disconnect, privacy, password, account deletion (cascades all data).

## Architecture

```
prisma/schema.prisma     Data model (users, accounts, sessions, repos, activity, education, experience,
                         projects, members, posts, comments, likes, bookmarks, follows, swipes, matches,
                         conversations, messages, hackathons, attendance, notifications, AI drafts)
prisma/seed.ts           Sample data (idempotent)
src/lib/                 Server logic: auth, crypto, github, ai, matching, deck, feed, messages, validation
src/app/api/**           REST route handlers (auth, rate limit and zod validation via lib/api.ts)
src/app/(auth)/          Login, sign up, password reset
src/app/(app)/           Authenticated app: home, explore, match, projects, map, messages, notifications,
                         ai, u/[username], post/[id], settings
src/components/          UI by feature
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide, Prisma, Leaflet, Zod.

**Security:** secrets server-side only; encrypted OAuth tokens; hashed session and reset tokens; per-user rate limits on every mutation; zod validation; ownership checks on every write; private repos never exposed in posts, search or other users' views; upload type and size checks; SSRF guard on URL fetches; security headers.

## Scaling notes / production checklist

- **Database:** SQLite for zero-setup local dev. For Supabase/Postgres, set `provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at your database, and run `npx prisma db push`. Postgres string `contains` is case-sensitive, so add `mode: "insensitive"` in `src/app/api/search/route.ts` (or use full-text search).
- **Realtime:** messages, typing and notifications poll. Swap in Supabase Realtime (or websockets) behind the same API for push delivery.
- **Rate limiting** is in-memory per process; use Redis/Upstash when running multiple instances.
- **Uploads** go to `public/uploads`; use Supabase Storage or S3 in production.
- **Email:** wire a provider into `/api/auth/forgot` (reset links are only shown on-page in development).
- **Admin:** set `isAdmin = true` on a user (the seeded demo user is an admin) to moderate events and run the Devpost import.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript check |
| `npm run setup` | Create DB schema and seed |
| `npm run db:seed` | Re-seed sample data (removes previous sample data only) |
| `npm run db:reset` | Wipe the DB and re-seed |
