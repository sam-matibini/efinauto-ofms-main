import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * AI Account Mapper - Suggests the best account for a transaction
 */
export async function suggestAccount(transactionData, companyId) {
  try {
    // Get chart of accounts
    const accounts = await base44.entities.Account.filter({ company_id: companyId });
    
    if (accounts.length === 0) {
      return null;
    }

    const accountsList = accounts.map(a => 
      `${a.account_code} - ${a.account_name} (${a.account_type}, ${a.account_category})`
    ).join('\n');

    const prompt = `Given this transaction and available accounts, suggest the most appropriate account.

Transaction:
- Type: ${transactionData.transaction_type}
- Category: ${transactionData.category}
- Description: ${transactionData.description || 'N/A'}
- Amount: $${transactionData.amount}
${transactionData.customer_name ? `- Customer: ${transactionData.customer_name}` : ''}
${transactionData.reference_type ? `- Reference: ${transactionData.reference_type}` : ''}

Available Accounts:
${accountsList}

Return the account code, name, and reason for selection.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          account_code: { type: "string" },
          account_name: { type: "string" },
          reason: { type: "string" }
        }
      }
    });

    // Find the actual account
    const account = accounts.find(a => a.account_code === result.account_code);
    
    return {
      ...result,
      account_id: account?.id,
      account
    };
  } catch (error) {
    console.error('AI account mapping error:', error);
    return null;
  }
}

export function AIAccountMapperButton({ transactionData, onAccountSelected, companyId }) {
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const suggestion = await suggestAccount(transactionData, companyId);
      
      if (suggestion && suggestion.account) {
        onAccountSelected(suggestion.account);
        toast.success(`AI suggests: ${suggestion.account_code} - ${suggestion.account_name}`, {
          description: suggestion.reason
        });
      } else {
        toast.info("No account suggestion available");
      }
    } catch (error) {
      toast.error("Failed to get AI suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSuggest}
      disabled={loading}
      className="text-purple-600 hover:text-purple-700 hover:border-purple-300"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          AI Suggesting...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-1" />
          AI Suggest
        </>
      )}
    </Button>
  );
}