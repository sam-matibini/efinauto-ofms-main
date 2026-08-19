import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

// Resolves the technician records owned by the current user (via Technician.employee_id
// == user.data.employee_entity_id) and role flags used to scope timesheet access in the
// app layer. The Timesheet RLS can't express cross-table ownership, so this hook enforces
// technician-scoping client-side: privileged roles see/manage all entries; everyone else
// only sees entries for technician records linked to them.
export function useTechnicianScope() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => supabase.auth.me(),
  });

  const role = user?.role;
  const canViewAll = ["admin", "manager", "accountant"].includes(role);
  const canEditAll = ["admin", "manager"].includes(role);
  const employeeEntityId = user?.data?.employee_entity_id;

  const { data: ownedTechnicians = [] } = useQuery({
    queryKey: ["ownedTechnicians", employeeEntityId],
    queryFn: () =>
      supabase.entities.Technician.filter({ employee_id: employeeEntityId }),
    enabled: !!employeeEntityId && !canViewAll,
    initialData: [],
  });

  const ownedTechnicianIds = (ownedTechnicians || []).map((t) => t.id);

  return { user, role, canViewAll, canEditAll, ownedTechnicianIds };
}