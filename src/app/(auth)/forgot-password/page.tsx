import Link from "next/link";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Forgot your password?</h1>
      <p className="mb-8 mt-2 text-ink-mute">No stress. We&apos;ll send you a reset link.</p>
      <ForgotForm />
      <p className="mt-8 text-center text-sm text-ink-mute">
        <Link href="/login" className="font-bold text-grape hover:underline">Back to log in</Link>
      </p>
    </>
  );
}
