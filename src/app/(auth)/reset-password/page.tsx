import { Suspense } from "react";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Choose a new password" };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Choose a new password</h1>
      <p className="mb-8 mt-2 text-ink-mute">You&apos;ll be signed out of other devices.</p>
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
