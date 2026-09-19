"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/audit";

// ============================================================
// INVITE USER (via Supabase Auth Admin API)
// ============================================================
export async function inviteUser(input: {
  email: string;
  full_name: string;
  role_id: string;
  organisation_id: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Cek permission
  const { data: perms } = await supabase.rpc("current_user_permissions");
  if (!((perms ?? []) as string[]).includes("USER_MANAGE")) {
    return { error: "Anda tidak memiliki izin untuk menambah user." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: "Server configuration incomplete." };
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Invite via admin API
  const { data: inviteData, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.full_name },
    });

  if (inviteErr) {
    return { error: `Gagal invite: ${inviteErr.message}` };
  }

  const newUserId = inviteData.user?.id;
  if (!newUserId) return { error: "Gagal mendapatkan user ID baru." };

  // Update profile
  await admin
    .from("profiles")
    .update({
      full_name: input.full_name,
      organisation_id: input.organisation_id || null,
    })
    .eq("id", newUserId);

  // Assign role
  if (input.role_id) {
    await admin.from("user_roles").insert({
      user_id: newUserId,
      role_id: input.role_id,
      assigned_by: user.id,
    });
  }

  await writeAudit({
    action: "INVITE_USER",
    module: "User",
    resourceType: "user",
    resourceId: newUserId,
    newValue: { email: input.email, role_id: input.role_id },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

// ============================================================
// TOGGLE ACTIVE
// ============================================================
export async function toggleUserActive(userId: string, active: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: perms } = await supabase.rpc("current_user_permissions");
  if (!((perms ?? []) as string[]).includes("USER_MANAGE")) {
    return { error: "Anda tidak memiliki izin." };
  }

  if (userId === user.id) {
    return { error: "Tidak dapat menonaktifkan akun sendiri." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", userId);

  if (error) return { error: error.message };

  await writeAudit({
    action: active ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    module: "User",
    resourceType: "user",
    resourceId: userId,
    newValue: { is_active: active },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

// ============================================================
// ASSIGN / REMOVE ROLE
// ============================================================
export async function updateUserRole(
  userId: string,
  roleId: string,
  action: "add" | "remove"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: perms } = await supabase.rpc("current_user_permissions");
  if (!((perms ?? []) as string[]).includes("USER_MANAGE")) {
    return { error: "Anda tidak memiliki izin." };
  }

  if (action === "add") {
    const { error } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role_id: roleId, assigned_by: user.id },
        { onConflict: "user_id,role_id" }
      );
    if (error) return { error: error.message };

    await writeAudit({
      action: "ADD_ROLE",
      module: "User",
      resourceType: "user_role",
      resourceId: userId,
      newValue: { role_id: roleId },
    });
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", roleId);
    if (error) return { error: error.message };

    await writeAudit({
      action: "REMOVE_ROLE",
      module: "User",
      resourceType: "user_role",
      resourceId: userId,
      oldValue: { role_id: roleId },
    });
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

// ============================================================
// UPDATE PROFILE
// ============================================================
export async function updateUserProfile(
  userId: string,
  input: { full_name?: string; job_title?: string; department?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: perms } = await supabase.rpc("current_user_permissions");
  if (!((perms ?? []) as string[]).includes("USER_MANAGE")) {
    return { error: "Anda tidak memiliki izin." };
  }

  const { error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId);

  if (error) return { error: error.message };

  await writeAudit({
    action: "UPDATE_USER",
    module: "User",
    resourceType: "user",
    resourceId: userId,
    newValue: input,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

// ============================================================
// GET USER DETAIL (Server Action — callable from client)
// ============================================================
export async function getUserDetailAction(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  // Roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(id, name, display_name, description)")
    .eq("user_id", userId);

  const roles = (userRoles ?? [])
    .map((ur) => {
const r = ur.roles as unknown as {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
} | null;
      return r;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Permissions via roles
  const roleIds = roles.map((r) => r.id);
  const { data: rolePerms } = roleIds.length
    ? await supabase
        .from("role_permissions")
        .select("permission_id, permissions(code, description)")
        .in("role_id", roleIds)
    : { data: [] };

  const permSet = new Map<
    string,
    { code: string; description: string | null }
  >();
  for (const rp of rolePerms ?? []) {
const p = rp.permissions as unknown as {
  code: string;
  description: string | null;
} | null;
    if (p) permSet.set(p.code, p);
  }
  const permissions = Array.from(permSet.values());

  // Recent activity
  const { data: activity } = await supabase
    .from("audit_logs")
    .select("action, module, created_at, result")
    .eq("actor_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  // Org info
  let orgName: string | null = null;
  if (profile.organisation_id) {
    const { data: org } = await supabase
      .from("organisations")
      .select("name, type")
      .eq("id", profile.organisation_id)
      .maybeSingle();
    orgName = org?.name ?? null;
  }

  return {
    profile: { ...profile, organisation_name: orgName },
    roles,
    permissions,
    activity: activity ?? [],
  };
}