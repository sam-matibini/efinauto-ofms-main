import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useCompany } from "./CompanyContext";

export default function CompanySelector() {
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const activeCompanies = companies.filter(c => c.status === 'active');

  React.useEffect(() => {
    if (!selectedCompanyId && activeCompanies.length > 0) {
      setSelectedCompanyId(activeCompanies[0].id);
    }
  }, [activeCompanies, selectedCompanyId, setSelectedCompanyId]);

  if (activeCompanies.length === 0) {
    return null;
  }

  return (
    <Select value={selectedCompanyId || ""} onValueChange={setSelectedCompanyId}>
      <SelectTrigger className="w-full bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <SelectValue placeholder="Select company..." className="truncate" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {activeCompanies.map((company) => (
          <SelectItem key={company.id} value={company.id} className="cursor-pointer">
            <div className="truncate" title={company.name}>
              {company.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}