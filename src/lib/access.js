export const ADMIN_PAGE_IDS = new Set([
  "AdminPortal",
  "Companies",
  "Settings",
  "BOSSettings",
  "UserManagement",
  "AuditLogs",
  "IntegrationDiagram",
  "Pricing",
  "TaxSettings",
]);

export function isAdminUser(user) {
  return user?.role === "admin";
}

export function canSeeNavItem(item, user, allowedPageIds) {
  if (ADMIN_PAGE_IDS.has(item?.pageId)) return isAdminUser(user);
  if (allowedPageIds?.length && !allowedPageIds.includes(item.pageId)) return false;
  return true;
}
