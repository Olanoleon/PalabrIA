import { requireRole } from "@/lib/rbac";

/** Gate for the whole Org Admin console. */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  await requireRole("ORG_ADMIN");
  return children;
}
