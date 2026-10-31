import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPost } from "@/lib/feed";
import { PostCard } from "@/components/feed/PostCard";

export const metadata = { title: "Post" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const post = await getPost(me.id, id);
  if (!post) notFound();
  return (
    <div className="mx-auto max-w-[640px] px-4 py-5 md:py-8">
      <Link href="/" className="btn-ghost mb-4 -ml-3"><ArrowLeft className="h-4 w-4" /> Back to feed</Link>
      <PostCard post={post} defaultOpenComments />
    </div>
  );
}
