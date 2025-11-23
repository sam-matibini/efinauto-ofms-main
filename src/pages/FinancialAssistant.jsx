import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import AIChatInterface from "@/components/financial-assistant/AIChatInterface";
import ProactiveInsights from "@/components/financial-assistant/ProactiveInsights";
import FinancialHealthScore from "@/components/financial-assistant/FinancialHealthScore";

export default function FinancialAssistantPage() {
  const { selectedCompanyId } = useCompany();

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: bankTransactions = [] } = useQuery({
    queryKey: ['bankTransactions', selectedCompanyId],
    queryFn: () => base44.entities.BankTransaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedCompanyId],
    queryFn: () => base44.entities.Expense.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const financialData = {
    sales,
    transactions,
    bankTransactions,
    repairs,
    expenses,
    accounts
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Please select a company to access the AI Financial Assistant.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              AI Financial Assistant
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Intelligent insights, issue detection, and financial guidance
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <FinancialHealthScore financialData={financialData} />

        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Proactive Insights
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Ask Questions
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Detected Issues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights">
            <ProactiveInsights 
              financialData={financialData} 
              companyId={selectedCompanyId}
              insightType="performance"
            />
          </TabsContent>

          <TabsContent value="chat">
            <AIChatInterface 
              financialData={financialData} 
              companyId={selectedCompanyId}
            />
          </TabsContent>

          <TabsContent value="issues">
            <ProactiveInsights 
              financialData={financialData} 
              companyId={selectedCompanyId}
              insightType="issues"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}