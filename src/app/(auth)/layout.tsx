import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? "/" : "/onboarding");
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <AuthShowcase />
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-ink-faint">Don&apos;t just code alone. Find your people.</p>
      </div>
    </div>
  );
}
