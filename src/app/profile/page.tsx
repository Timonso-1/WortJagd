import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function OwnProfile() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/login");
  redirect(`/profile/${session.user.id}`);
}
