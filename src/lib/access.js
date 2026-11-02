// Role model (mirrors supabase/migrations/20261031100000_rls_rebuild.sql and
// supabase/functions/_shared/authz.ts — keep them in sync):
//   super_admin  eFin staff: every company
//   admin        dealership owner: everything in their own company
//   manager      operations in their own company
//   others       members of their own company; pages limited by accessible_modules
// The database enforces company isolation; these checks only shape the UI.

export const ROLE_RANK = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  accountant: 20,
  sales: 20,
  technician: 20,
  inventory_manager: 20,
  user: 10,
};

export const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin (eFin staff)" },
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales Staff" },
  { value: "technician", label: "Technician" },
  { value: "inventory_manager", label: "Inventory Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "user", label: "Regular User" },
];

// Platform pages for eFin staff only.
export const SUPER_ADMIN_PAGE_IDS = new Set(["IntegrationDiagram", "Pricing"]);

// Company administration: admins and managers, scoped to their own company.
export const COMPANY_ADMIN_PAGE_IDS = new Set([
  "AdminPortal",
  "Companies",
  "Settings",
  "BOSSettings",
  "UserManagement",
  "AuditLogs",
  "TaxSettings",
]);

export function roleRank(role) {
  return ROLE_RANK[role] || 0;
}

export function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

/** Dealership owner or eFin staff. */
export function isAdminUser(user) {
  return user?.role === "admin" || isSuperAdmin(user);
}

/** Can administer their company (admin, manager) or any company (super_admin). */
export function isCompanyManager(user) {
  return user?.role === "manager" || isAdminUser(user);
}

/** Highest role rank this user may assign or manage. */
export function maxAssignableRank(user) {
  switch (user?.role) {
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

export function assignableRoles(user) {
  const max = maxAssignableRank(user);
  return ROLE_OPTIONS.filter((option) => roleRank(option.value) <= max);
}

/** Whether `user` may edit `target` (another account) at all. */
export function canManageUser(user, target) {
  if (!target || target.id === user?.id) return false;
  if (isSuperAdmin(user)) return true;
  if (!user?.company_id || target.company_id !== user.company_id) return false;
  return roleRank(target.role) <= maxAssignableRank(user);
}

export function canAccessPage(pageId, user) {
  if (SUPER_ADMIN_PAGE_IDS.has(pageId)) return isSuperAdmin(user);
  if (COMPANY_ADMIN_PAGE_IDS.has(pageId)) return isCompanyManager(user);
  return true;
}

export function canSeeNavItem(item, user, allowedPageIds) {
  const pageId = item?.pageId;
  if (SUPER_ADMIN_PAGE_IDS.has(pageId) || COMPANY_ADMIN_PAGE_IDS.has(pageId)) {
    return canAccessPage(pageId, user);
  }
  if (allowedPageIds?.length && !allowedPageIds.includes(pageId)) return false;
  return true;
}
