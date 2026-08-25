import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus } from "lucide-react";
import { useCompany } from "./CompanyContext";

export default function CompanySelector({ onAddCompany }) {
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();

  const { user: currentUser } = useAuth();

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => supabase.entities.Company.list(),
    initialData: [],
  });

  const isAdmin = currentUser?.role === 'admin';
  const userCompanyId = currentUser?.company_id;

  // Filter companies based on user role
  const activeCompanies = companies.filter(c => {
    if (c.status !== 'active') return false;
    if (isAdmin) return true;
    return c.id === userCompanyId;
  });

  React.useEffect(() => {
    // Auto-select user's assigned company for non-admin users
    if (!selectedCompanyId && activeCompanies.length > 0) {
      if (!isAdmin && userCompanyId) {
        setSelectedCompanyId(userCompanyId);
      } else {
        setSelectedCompanyId(activeCompanies[0].id);
      }
    }
  }, [activeCompanies, selectedCompanyId, setSelectedCompanyId, isAdmin, userCompanyId]);

  if (activeCompanies.length === 0) {
    return null;
  }

  // For non-admin users with only one company, show locked company name
  if (!isAdmin && activeCompanies.length === 1) {
    return (
      <div className="w-full bg-gray-100 rounded-md px-3 py-2 border border-gray-200">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 flex-shrink-0 text-gray-600" />
          <span className="text-sm text-gray-700 truncate">
            {activeCompanies[0].display_name || activeCompanies[0].name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Select value={selectedCompanyId || ""} onValueChange={setSelectedCompanyId}>
      <SelectTrigger className="w-full bg-white" style={{ color: '#1e293b' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: '#1e293b' }} />
          <SelectValue placeholder="Select company..." className="truncate" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {activeCompanies.map((company) => (
          <SelectItem key={company.id} value={company.id} className="cursor-pointer">
            <div className="truncate" title={company.display_name || company.name}>
              {company.display_name || company.name}
            </div>
          </SelectItem>
        ))}
        {isAdmin && onAddCompany && (
          <>
            <SelectSeparator />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddCompany(); }}
              className="relative flex w-full items-center rounded-sm py-1.5 pl-2 pr-8 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </button>
          </>
        )}
      </SelectContent>
    </Select>
  );
}