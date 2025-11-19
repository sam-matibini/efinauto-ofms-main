import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hasPermission } from "./permissions";

// Component to guard content based on permissions
export default function PermissionGuard({ module, action, children, fallback = null }) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!currentUser) return fallback;

  const userRole = currentUser.data?.role || currentUser.role;
  
  if (hasPermission(userRole, module, action)) {
    return <>{children}</>;
  }

  return fallback;
}

// Hook to check permissions
export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const userRole = currentUser?.data?.role || currentUser?.role;

  return {
    hasPermission: (module, action) => hasPermission(userRole, module, action),
    userRole,
    currentUser
  };
}