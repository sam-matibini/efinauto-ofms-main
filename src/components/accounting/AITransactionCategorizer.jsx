import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Brain, Check, X, Sparkles, AlertCircle, Clock, 
  ThumbsUp, ThumbsDown, Plus, Trash2, Edit, Zap, Loader2
} from "lucide-react";
import { format } from "date-fns";

export default function AITransactionCategorizer({ uncategorizedTransactions = [], onCategorize }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({
    rule_name: "",
    match_type: "contains",
    match_field: "description",
    match_value: "",
    target_account_id: "",
    target_category: "expense",
    priority: 0
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['transaction-rules', selectedCompanyId],
    queryFn: () => supabase.entities.TransactionRule.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => supabase.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: historicalTransactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => supabase.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => supabase.entities.TransactionRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
      toast.success("Rule created successfully");
      setShowRuleDialog(false);
      resetRuleForm();
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.TransactionRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
      toast.success("Rule updated");
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => supabase.entities.TransactionRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
      toast.success("Rule deleted");
    }
  });

  const resetRuleForm = () => {
    setNewRule({
      rule_name: "",
      match_type: "contains",
      match_field: "description",
      match_value: "",
      target_account_id: "",
      target_category: "expense",
      priority: 0
    });
    setEditingRule(null);
  };

  // Apply existing rules to transactions
  const applyRules = (transaction) => {
    const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const rule of sortedRules) {
      if (rule.status !== 'active') continue;
      
      const fieldValue = transaction[rule.match_field] || transaction.description || "";
      const matchValue = rule.match_value?.toLowerCase() || "";
      const fieldLower = fieldValue.toLowerCase();
      
      let matches = false;
      switch (rule.match_type) {
        case 'contains':
          matches = fieldLower.includes(matchValue);
          break;
        case 'exact':
          matches = fieldLower === matchValue;
          break;
        case 'starts_with':
          matches = fieldLower.startsWith(matchValue);
          break;
        case 'ends_with':
          matches = fieldLower.endsWith(matchValue);
          break;
        case 'regex':
          try {
            matches = new RegExp(rule.match_value, 'i').test(fieldValue);
          } catch { matches = false; }
          break;
      }
      
      if (matches) {
        return {
          account_id: rule.target_account_id,
          account_name: rule.target_account_name,
          category: rule.target_category,
          rule_id: rule.id,
          confidence: rule.confidence_score || 1,
          source: 'rule'
        };
      }
    }
    return null;
  };

  // AI-based categorization
  const analyzeWithAI = async () => {
    if (uncategorizedTransactions.length === 0) {
      toast.info("No uncategorized transactions to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const accountsList = accounts.map(a => ({
        id: a.id,
        name: a.account_name,
        code: a.account_code,
        type: a.account_type
      }));

      const existingPatterns = historicalTransactions
        .filter(t => t.account_id)
        .slice(0, 100)
        .map(t => ({
          description: t.description,
          account_name: accounts.find(a => a.id === t.account_id)?.account_name,
          category: t.category
        }));

      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `You are a financial transaction categorization expert. Analyze these uncategorized transactions and suggest the best GL account for each.

Available GL Accounts:
${JSON.stringify(accountsList, null, 2)}

Historical categorization patterns (learn from these):
${JSON.stringify(existingPatterns.slice(0, 50), null, 2)}

Existing rules:
${JSON.stringify(rules.map(r => ({ match: r.match_value, account: r.target_account_name })), null, 2)}

Transactions to categorize:
${JSON.stringify(uncategorizedTransactions.map(t => ({
  id: t.id,
  description: t.description,
  amount: t.amount,
  reference: t.reference_number,
  date: t.transaction_date
})), null, 2)}

For each transaction, provide:
1. The suggested account_id from the available accounts
2. A confidence score (0-1)
3. A brief reason for the categorization
4. Whether a new rule should be created for similar transactions
5. If a rule should be created, the pattern to match`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  transaction_id: { type: "string" },
                  suggested_account_id: { type: "string" },
                  suggested_account_name: { type: "string" },
                  confidence: { type: "number" },
                  reason: { type: "string" },
                  create_rule: { type: "boolean" },
                  rule_pattern: { type: "string" }
                }
              }
            }
          }
        }
      });

      const aiSuggestions = response.suggestions.map(s => {
        const transaction = uncategorizedTransactions.find(t => t.id === s.transaction_id);
        return {
          ...s,
          transaction,
          source: 'ai'
        };
      });

      setSuggestions(aiSuggestions);
      toast.success(`Analyzed ${aiSuggestions.length} transactions`);
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error("Failed to analyze transactions");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Process all transactions with rules first
  useEffect(() => {
    if (uncategorizedTransactions.length > 0 && rules.length > 0) {
      const autoSuggestions = uncategorizedTransactions
        .map(t => {
          const ruleMatch = applyRules(t);
          if (ruleMatch) {
            return {
              transaction_id: t.id,
              transaction: t,
              suggested_account_id: ruleMatch.account_id,
              suggested_account_name: ruleMatch.account_name,
              confidence: ruleMatch.confidence,
              reason: `Matched rule for "${rules.find(r => r.id === ruleMatch.rule_id)?.match_value}"`,
              rule_id: ruleMatch.rule_id,
              source: 'rule'
            };
          }
          return null;
        })
        .filter(Boolean);

      if (autoSuggestions.length > 0) {
        setSuggestions(prev => [...autoSuggestions, ...prev.filter(s => s.source === 'ai')]);
      }
    }
  }, [uncategorizedTransactions, rules]);

  const handleAcceptSuggestion = async (suggestion) => {
    try {
      // Update the transaction
      if (onCategorize) {
        await onCategorize(suggestion.transaction_id, {
          account_id: suggestion.suggested_account_id,
          category: suggestion.suggested_category || 'expense'
        });
      }

      // Update rule stats if from a rule
      if (suggestion.rule_id) {
        const rule = rules.find(r => r.id === suggestion.rule_id);
        if (rule) {
          await updateRuleMutation.mutateAsync({
            id: rule.id,
            data: {
              times_applied: (rule.times_applied || 0) + 1,
              times_confirmed: (rule.times_confirmed || 0) + 1
            }
          });
        }
      }

      // Create new rule if AI suggested
      if (suggestion.create_rule && suggestion.rule_pattern) {
        await createRuleMutation.mutateAsync({
          company_id: selectedCompanyId,
          rule_name: `Auto: ${suggestion.rule_pattern}`,
          match_type: 'contains',
          match_field: 'description',
          match_value: suggestion.rule_pattern,
          target_account_id: suggestion.suggested_account_id,
          target_account_name: suggestion.suggested_account_name,
          is_ai_generated: true,
          confidence_score: suggestion.confidence,
          status: 'active'
        });
      }

      setSuggestions(prev => prev.filter(s => s.transaction_id !== suggestion.transaction_id));
      toast.success("Transaction categorized");
    } catch (error) {
      toast.error("Failed to categorize transaction");
    }
  };

  const handleRejectSuggestion = async (suggestion) => {
    if (suggestion.rule_id) {
      const rule = rules.find(r => r.id === suggestion.rule_id);
      if (rule) {
        await updateRuleMutation.mutateAsync({
          id: rule.id,
          data: {
            times_rejected: (rule.times_rejected || 0) + 1,
            confidence_score: Math.max(0, (rule.confidence_score || 1) - 0.1)
          }
        });
      }
    }
    setSuggestions(prev => prev.filter(s => s.transaction_id !== suggestion.transaction_id));
  };

  const handleSaveRule = async () => {
    const ruleData = {
      company_id: selectedCompanyId,
      ...newRule,
      target_account_name: accounts.find(a => a.id === newRule.target_account_id)?.account_name
    };

    if (editingRule) {
      await updateRuleMutation.mutateAsync({ id: editingRule.id, data: ruleData });
    } else {
      await createRuleMutation.mutateAsync(ruleData);
    }
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (confidence >= 0.5) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Suggestions ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Rules ({rules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Transaction Categorizer
                </CardTitle>
                <Button 
                  onClick={analyzeWithAI} 
                  disabled={isAnalyzing || uncategorizedTransactions.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Analyze with AI</>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                {uncategorizedTransactions.length} uncategorized transactions • {suggestions.length} suggestions ready
              </p>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No suggestions yet. Click "Analyze with AI" to categorize transactions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {suggestion.transaction?.description || 'Transaction'}
                            </span>
                            {getConfidenceBadge(suggestion.confidence)}
                            <Badge variant="outline" className="text-xs">
                              {suggestion.source === 'rule' ? 'Rule Match' : 'AI Suggested'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">${(suggestion.transaction?.amount || 0).toFixed(2)}</span>
                            {suggestion.transaction?.transaction_date && (
                              <span className="ml-2">
                                {format(new Date(suggestion.transaction.transaction_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-gray-500">Suggested:</span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {suggestion.suggested_account_name || 'Unknown Account'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleAcceptSuggestion(suggestion)}
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectSuggestion(suggestion)}
                          >
                            <ThumbsDown className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Categorization Rules
                </CardTitle>
                <Button onClick={() => { resetRuleForm(); setShowRuleDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No rules defined yet. Create rules to automatically categorize transactions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.rule_name || rule.match_value}</span>
                            <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                              {rule.status}
                            </Badge>
                            {rule.is_ai_generated && (
                              <Badge className="bg-purple-100 text-purple-800">AI Generated</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            If {rule.match_field} <span className="font-mono bg-gray-100 px-1 rounded">{rule.match_type}</span> "{rule.match_value}"
                            → <span className="text-blue-600">{rule.target_account_name}</span>
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Applied: {rule.times_applied || 0}</span>
                            <span className="text-green-600">✓ {rule.times_confirmed || 0}</span>
                            <span className="text-red-600">✗ {rule.times_rejected || 0}</span>
                            <span>Confidence: {((rule.confidence_score || 1) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingRule(rule);
                              setNewRule({
                                rule_name: rule.rule_name || '',
                                match_type: rule.match_type,
                                match_field: rule.match_field,
                                match_value: rule.match_value,
                                target_account_id: rule.target_account_id,
                                target_category: rule.target_category || 'expense',
                                priority: rule.priority || 0
                              });
                              setShowRuleDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rule Name</label>
              <Input
                value={newRule.rule_name}
                onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                placeholder="e.g., Office Supplies"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Match Field</label>
                <Select value={newRule.match_field} onValueChange={(v) => setNewRule({ ...newRule, match_field: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="description">Description</SelectItem>
                    <SelectItem value="reference_number">Reference</SelectItem>
                    <SelectItem value="vendor_name">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Match Type</label>
                <Select value={newRule.match_type} onValueChange={(v) => setNewRule({ ...newRule, match_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="exact">Exact Match</SelectItem>
                    <SelectItem value="starts_with">Starts With</SelectItem>
                    <SelectItem value="ends_with">Ends With</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Match Value</label>
              <Input
                value={newRule.match_value}
                onChange={(e) => setNewRule({ ...newRule, match_value: e.target.value })}
                placeholder="e.g., Office Depot"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Target Account</label>
              <Select value={newRule.target_account_id} onValueChange={(v) => setNewRule({ ...newRule, target_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority (higher = checked first)</label>
              <Input
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRule} disabled={!newRule.match_value || !newRule.target_account_id}>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}