import { requireRole } from "@/lib/rbac";

/** Gate for the whole Super Admin console. */
export default async function SuperLayout({ children }: LayoutProps<"/">) {
  await requireRole("SUPER_ADMIN");
  return children;
}
