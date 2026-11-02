// Shared authorization helpers for edge functions. Mirrors the SQL helpers in
// migrations/20261031100000_rls_rebuild.sql — keep the two in sync.
//
//   super_admin  eFin staff: every company
//   admin        dealership owner: everything in their own company
//   manager      operations in their own company
//   others       members of their own company

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface CallerProfile {
  id: string;
  email: string | null;
  role: string | null;
  company_id: string | null;
}

export const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  accountant: 20,
  sales: 20,
  technician: 20,
  inventory_manager: 20,
  user: 10,
};

export const VALID_ROLES = new Set(Object.keys(ROLE_RANK));

export function roleRank(role: string | null | undefined): number {
  return (role && ROLE_RANK[role]) || 0;
}

/** Highest role rank the caller may assign or manage. */
export function maxAssignableRank(profile: CallerProfile | null): number {
  switch (profile?.role) {
    case "super_admin":
      return 100;
    case "admin":
      return 80;
    case "manager":
      return 59;
    default:
      return 0;
  }
}

export function isSuperAdmin(profile: CallerProfile | null): boolean {
  return profile?.role === "super_admin";
}

export function canAccessCompany(
  profile: CallerProfile | null,
  companyId: string | null | undefined,
): boolean {
  if (!profile || !companyId) return false;
  if (isSuperAdmin(profile)) return true;
  return !!profile.company_id && profile.company_id === companyId;
}

/** Caller belongs to `companyId` with one of `roles` (super_admin always passes). */
export function hasCompanyRole(
  profile: CallerProfile | null,
  companyId: string | null | undefined,
  roles: string[] = ["admin", "manager"],
): boolean {
  if (isSuperAdmin(profile)) return !!companyId;
  return canAccessCompany(profile, companyId) && roles.includes(profile?.role ?? "");
}

/**
 * Loads the caller's core.users profile with the service-role client, falling
 * back to an email match for profiles created before ids were linked.
 */
export async function loadCallerProfile(
  service: SupabaseClient,
  caller: { id: string; email?: string | null },
): Promise<CallerProfile | null> {
  const columns = "id, email, role, company_id";
  const byId = await service
    .schema("core")
    .from("users")
    .select(columns)
    .eq("id", caller.id)
    .maybeSingle();
  if (byId.data) return normalize(byId.data as CallerProfile);

  if (!caller.email) return null;
  const byEmail = await service
    .schema("core")
    .from("users")
    .select(columns)
    .ilike("email", caller.email)
    .maybeSingle();
  return byEmail.data ? normalize(byEmail.data as CallerProfile) : null;
}

function normalize(profile: CallerProfile): CallerProfile {
  return { ...profile, company_id: profile.company_id || null };
}
