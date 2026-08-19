import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TransactionRulesManager({ rules, glAccounts, companyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  const createRuleMutation = useMutation({
    mutationFn: (data) => supabase.entities.TransactionRule.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionRules'] });
      setDialogOpen(false);
      setEditingRule(null);
      toast.success("Rule created successfully");
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.TransactionRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionRules'] });
      setDialogOpen(false);
      setEditingRule(null);
      toast.success("Rule updated successfully");
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => supabase.entities.TransactionRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionRules'] });
      toast.success("Rule deleted successfully");
    },
  });

  const handleSaveRule = (data) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Transaction Rules
            </CardTitle>
            <Button
              onClick={() => {
                setEditingRule(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No transaction rules yet</p>
              <p className="text-sm text-gray-500 mt-1">Create rules to automatically categorize transactions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules
                .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                .map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{rule.rule_name}</h4>
                          {rule.ai_generated && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          <Badge variant={rule.enabled ? 'default' : 'outline'}>
                            {rule.enabled ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="capitalize">
                            {rule.apply_to === 'both' ? 'All Transactions' : 
                             rule.apply_to === 'credit' ? 'Deposits' : 'Withdrawals'}
                          </Badge>
                          <Badge variant="outline">
                            Match: {rule.match_type === 'all' ? 'All criteria' : 'Any criteria'}
                          </Badge>
                          {rule.criteria?.map((c, i) => (
                            <Badge key={i} variant="outline">
                              {c.field} {c.operator} "{c.value}"
                            </Badge>
                          ))}
                          {rule.actions?.gl_account_name && (
                            <Badge className="bg-blue-100 text-blue-800">
                              → {rule.actions.gl_account_name}
                            </Badge>
                          )}
                          {rule.actions?.auto_post && (
                            <Badge className="bg-green-100 text-green-800">
                              Auto-Post
                            </Badge>
                          )}
                        </div>
                        {rule.times_applied > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Applied {rule.times_applied} times
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRule(rule);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this rule?')) {
                              deleteRuleMutation.mutate(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RuleDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingRule(null);
        }}
        rule={editingRule}
        onSave={handleSaveRule}
        glAccounts={glAccounts}
        isLoading={createRuleMutation.isPending || updateRuleMutation.isPending}
      />
    </div>
  );
}

function RuleDialog({ open, onClose, rule, onSave, glAccounts, isLoading }) {
  const [formData, setFormData] = useState({
    rule_name: "",
    description: "",
    apply_to: "both",
    match_type: "any",
    criteria: [
      { field: "description", operator: "contains", value: "" }
    ],
    actions: {
      category: "",
      gl_account_id: "",
      auto_post: false,
      auto_categorize: false
    },
    priority: 0,
    enabled: true
  });

  React.useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        rule_name: "",
        description: "",
        apply_to: "both",
        match_type: "any",
        criteria: [
          { field: "description", operator: "contains", value: "" }
        ],
        actions: {
          category: "",
          gl_account_id: "",
          auto_post: false,
          auto_categorize: false
        },
        priority: 0,
        enabled: true
      });
    }
  }, [rule, open]);

  const addCriterion = () => {
    setFormData({
      ...formData,
      criteria: [...formData.criteria, { field: "description", operator: "contains", value: "" }]
    });
  };

  const removeCriterion = (index) => {
    if (formData.criteria.length > 1) {
      setFormData({
        ...formData,
        criteria: formData.criteria.filter((_, i) => i !== index)
      });
    }
  };

  const updateCriterion = (index, field, value) => {
    const updated = [...formData.criteria];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, criteria: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.rule_name || !formData.actions.gl_account_id) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Validate criteria
    const hasValidCriteria = formData.criteria.some(c => c.value && c.value.trim() !== "");
    if (!hasValidCriteria) {
      toast.error("Please add at least one criteria with a value");
      return;
    }
    
    const account = glAccounts.find(a => a.id === formData.actions.gl_account_id);
    
    // Transform criteria format to match entity schema (conditions)
    const conditions = {
      transaction_type: formData.apply_to
    };
    
    // Convert criteria array to conditions object format
    formData.criteria.forEach(criterion => {
      if (criterion.value && criterion.value.trim()) {
        if (criterion.field === "description" && criterion.operator === "contains") {
          conditions.description_contains = conditions.description_contains || [];
          conditions.description_contains.push(criterion.value);
        } else if (criterion.field === "payee" && criterion.operator === "contains") {
          conditions.payee_contains = conditions.payee_contains || [];
          conditions.payee_contains.push(criterion.value);
        } else if (criterion.field === "amount") {
          if (criterion.operator === "equals") {
            conditions.amount_equals = parseFloat(criterion.value);
          } else if (criterion.operator === "greater_than") {
            conditions.amount_greater_than = parseFloat(criterion.value);
          } else if (criterion.operator === "less_than") {
            conditions.amount_less_than = parseFloat(criterion.value);
          }
        }
      }
    });
    
    onSave({
      rule_name: formData.rule_name,
      description: formData.description || "",
      conditions: conditions,
      actions: {
        category: formData.actions.category,
        gl_account_id: formData.actions.gl_account_id,
        gl_account_name: account?.account_name,
        auto_post: formData.actions.auto_post || false
      },
      priority: formData.priority || 0,
      enabled: formData.enabled !== false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Rule" : "Create Transaction Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Rule Name <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              placeholder="Enter rule name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Apply To <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="apply_to"
                  value="credit"
                  checked={formData.apply_to === "credit"}
                  onChange={(e) => setFormData({ ...formData, apply_to: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Deposits (Money In)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="apply_to"
                  value="debit"
                  checked={formData.apply_to === "debit"}
                  onChange={(e) => setFormData({ ...formData, apply_to: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Withdrawals (Money Out)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="apply_to"
                  value="both"
                  checked={formData.apply_to === "both"}
                  onChange={(e) => setFormData({ ...formData, apply_to: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Both</span>
              </label>
            </div>
          </div>

          <div className="space-y-3 pb-4 border-b">
            <Label className="text-sm font-medium">
              Categorise the transactions when <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-6 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="match_type"
                  value="all"
                  checked={formData.match_type === "all"}
                  onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">All the following criteria matches</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="match_type"
                  value="any"
                  checked={formData.match_type === "any"}
                  onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Any one of the following criteria matches</span>
              </label>
            </div>

            <div className="space-y-2">
              {formData.criteria.map((criterion, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Select
                    value={criterion.field}
                    onValueChange={(v) => updateCriterion(index, 'field', v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="description">Description</SelectItem>
                      <SelectItem value="payee">Payee</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="reference">Reference</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={criterion.operator}
                    onValueChange={(v) => updateCriterion(index, 'operator', v)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {criterion.field === "amount" ? (
                        <>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="greater_than">Greater than</SelectItem>
                          <SelectItem value="less_than">Less than</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="starts_with">Starts with</SelectItem>
                          <SelectItem value="ends_with">Ends with</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Enter value"
                    value={criterion.value}
                    onChange={(e) => updateCriterion(index, 'value', e.target.value)}
                    type={criterion.field === "amount" ? "number" : "text"}
                    step={criterion.field === "amount" ? "0.01" : undefined}
                    className="flex-1"
                  />

                  {formData.criteria.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={addCriterion}
              className="text-blue-600 p-0 h-auto"
            >
              + Add Criterion
            </Button>
          </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Record As
                    </Label>
                    <Select
                      value={formData.actions.category}
                      onValueChange={(v) => setFormData({ ...formData, actions: { ...formData.actions, category: v } })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Rent">Rent</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Fuel">Fuel</SelectItem>
                        <SelectItem value="Vehicle Maintenance">Vehicle Maintenance</SelectItem>
                        <SelectItem value="Payroll">Payroll</SelectItem>
                        <SelectItem value="Professional Fees">Professional Fees</SelectItem>
                        <SelectItem value="Marketing & Advertising">Marketing & Advertising</SelectItem>
                        <SelectItem value="Bank Fees">Bank Fees</SelectItem>
                        <SelectItem value="Interest">Interest</SelectItem>
                        <SelectItem value="Taxes">Taxes</SelectItem>
                        <SelectItem value="Sales Revenue">Sales Revenue</SelectItem>
                        <SelectItem value="Service Revenue">Service Revenue</SelectItem>
                        <SelectItem value="Other Income">Other Income</SelectItem>
                        <SelectItem value="Other Expense">Other Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Account <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      required
                      value={formData.actions.gl_account_id}
                      onValueChange={(v) => setFormData({ ...formData, actions: { ...formData.actions, gl_account_id: v } })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {glAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.account_code} - {acc.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Label className="text-sm font-medium">
                      Add Transaction in This Rule To <span className="text-red-500">*</span>
                    </Label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="auto_post"
                        checked={!formData.actions.auto_post}
                        onChange={(e) => setFormData({ ...formData, actions: { ...formData.actions, auto_post: !e.target.checked, auto_categorize: false } })}
                        className="w-4 h-4 mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium">Recognized Transactions</div>
                        <p className="text-xs text-gray-600 mt-1">
                          Your bank statements will be available in Recognized Transactions. You will have to categorize them manually.
                        </p>
                      </div>
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="auto_post"
                          checked={formData.actions.auto_post}
                          onChange={(e) => setFormData({ ...formData, actions: { ...formData.actions, auto_post: e.target.checked } })}
                          className="w-4 h-4 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">Categorized Transactions (Auto-Post)</div>
                          <p className="text-xs text-gray-600 mt-1">
                            This option will automatically categorize the bank statements with the transactions in eFinAuto based on the transaction rules you create.
                          </p>
                        </div>
                      </label>
                      {formData.actions.auto_post && (
                        <label className="flex items-center gap-2 ml-7 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.actions.auto_categorize || false}
                            onChange={(e) => setFormData({ ...formData, actions: { ...formData.actions, auto_categorize: e.target.checked } })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Allow the app to categorize my bank statements</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Rule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}