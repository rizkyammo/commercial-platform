import {
  listUsers,
  getUserStats,
  listRoles,
  listOrgUnitsSimple,
} from "@/features/admin/users/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { UsersClient } from "./users-client";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    org?: string;
  }>;
}) {
  const params = await searchParams;

  const [users, stats, roles, orgs] = await Promise.all([
    listUsers({
      q: params.q ?? "",
      roleId: params.role ?? "",
      status: params.status ?? "",
      orgId: params.org ?? "",
    }),
    getUserStats(),
    listRoles(),
    listOrgUnitsSimple(),
  ]);

  const supabase = await createClient();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage users, roles, and access to the AmmoBiz platform."
      />
      <UsersClient
        users={users}
        stats={stats}
        roles={roles}
        orgs={orgs}
        permissions={permissions}
        query={{
          q: params.q ?? "",
          role: params.role ?? "",
          status: params.status ?? "",
          org: params.org ?? "",
        }}
      />
    </div>
  );
}