import { requireUser } from "@/lib/auth";
import { githubConfigured } from "@/lib/github";
import { parseList } from "@/lib/json";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true });
  return (
    <OnboardingFlow
      githubConfigured={githubConfigured()}
      initial={{
        name: user.name,
        username: user.username,
        image: user.image,
        headline: user.headline,
        bio: user.bio,
        location: user.location,
        lat: user.lat,
        lng: user.lng,
        university: user.university,
        major: user.major,
        gradYear: user.gradYear,
        company: user.company,
        languages: parseList(user.languages),
        technologies: parseList(user.technologies),
        interests: parseList(user.interests),
        projectTypes: parseList(user.projectTypes),
        lookingForCollab: user.lookingForCollab,
        openToHackathons: user.openToHackathons,
        availability: user.availability,
        accent: user.accent as any,
        githubUsername: user.githubUsername,
      }}
    />
  );
}
