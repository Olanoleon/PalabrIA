import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";

export default async function RootPage() {
  const user = await currentUser();
  redirect(user ? homeFor(user.role) : "/login");
}
