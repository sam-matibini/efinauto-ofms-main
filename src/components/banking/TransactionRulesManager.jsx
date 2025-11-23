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
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TransactionRulesManager({ rules, glAccounts, companyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.TransactionRule.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionRules'] });
      setDialogOpen(false);
      setEditingRule(null);
      toast.success("Rule created successfully");
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransactionRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionRules'] });
      setDialogOpen(false);
      setEditingRule(null);
      toast.success("Rule updated successfully");
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.TransactionRule.delete(id),
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
                          {rule.conditions?.description_contains?.length > 0 && (
                            <Badge variant="outline">
                              Contains: {rule.conditions.description_contains.join(', ')}
                            </Badge>
                          )}
                          {rule.conditions?.payee_contains?.length > 0 && (
                            <Badge variant="outline">
                              Payee: {rule.conditions.payee_contains.join(', ')}
                            </Badge>
                          )}
                          {rule.conditions?.transaction_type && rule.conditions.transaction_type !== 'both' && (
                            <Badge variant="outline">
                              Type: {rule.conditions.transaction_type}
                            </Badge>
                          )}
                          {rule.conditions?.amount_equals && (
                            <Badge variant="outline">
                              Amount = ${rule.conditions.amount_equals}
                            </Badge>
                          )}
                          {rule.conditions?.amount_greater_than && (
                            <Badge variant="outline">
                              Amount {'>'} ${rule.conditions.amount_greater_than}
                            </Badge>
                          )}
                          {rule.conditions?.amount_less_than && (
                            <Badge variant="outline">
                              Amount {'<'} ${rule.conditions.amount_less_than}
                            </Badge>
                          )}
                          {rule.actions?.gl_account_name && (
                            <Badge className="bg-blue-100 text-blue-800">
                              → {rule.actions.gl_account_name}
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
    conditions: {
      description_contains: [],
      payee_contains: [],
      amount_equals: null,
      amount_greater_than: null,
      amount_less_than: null,
      transaction_type: "both"
    },
    actions: {
      category: "",
      gl_account_id: "",
      auto_post: false
    },
    priority: 0,
    enabled: true
  });

  const [descKeyword, setDescKeyword] = useState("");
  const [payeeKeyword, setPayeeKeyword] = useState("");

  React.useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        rule_name: "",
        description: "",
        conditions: {
          description_contains: [],
          payee_contains: [],
          amount_equals: null,
          amount_greater_than: null,
          amount_less_than: null,
          transaction_type: "both"
        },
        actions: {
          category: "",
          gl_account_id: "",
          auto_post: false
        },
        priority: 0,
        enabled: true
      });
    }
  }, [rule, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const account = glAccounts.find(a => a.id === formData.actions.gl_account_id);
    onSave({
      ...formData,
      actions: {
        ...formData.actions,
        gl_account_name: account?.account_name
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Rule" : "Create Transaction Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Name *</Label>
            <Input
              required
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold">Conditions</h4>
            
            <div className="space-y-2">
              <Label>Description Contains</Label>
              <div className="flex gap-2">
                <Input
                  value={descKeyword}
                  onChange={(e) => setDescKeyword(e.target.value)}
                  placeholder="Add keyword..."
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (descKeyword.trim()) {
                      setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          description_contains: [...(formData.conditions.description_contains || []), descKeyword.trim()]
                        }
                      });
                      setDescKeyword("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.conditions.description_contains?.map((kw, i) => (
                  <Badge key={i} variant="outline">
                    {kw}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            description_contains: formData.conditions.description_contains.filter((_, idx) => idx !== i)
                          }
                        });
                      }}
                      className="ml-2 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payee Contains</Label>
              <div className="flex gap-2">
                <Input
                  value={payeeKeyword}
                  onChange={(e) => setPayeeKeyword(e.target.value)}
                  placeholder="Add payee keyword..."
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (payeeKeyword.trim()) {
                      setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          payee_contains: [...(formData.conditions.payee_contains || []), payeeKeyword.trim()]
                        }
                      });
                      setPayeeKeyword("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.conditions.payee_contains?.map((kw, i) => (
                  <Badge key={i} variant="outline">
                    {kw}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            payee_contains: formData.conditions.payee_contains.filter((_, idx) => idx !== i)
                          }
                        });
                      }}
                      className="ml-2 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                </div>
                </div>

                <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select
                value={formData.conditions.transaction_type}
                onValueChange={(v) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, transaction_type: v }
                })}
                >
                <SelectTrigger>
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="both">Both (Debit & Credit)</SelectItem>
                <SelectItem value="debit">Debit Only (Money Out)</SelectItem>
                <SelectItem value="credit">Credit Only (Money In)</SelectItem>
                </SelectContent>
                </Select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                <Label>Amount Equals</Label>
                <Input
                type="number"
                step="0.01"
                placeholder="e.g., 100.00"
                value={formData.conditions.amount_equals || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    amount_equals: e.target.value ? parseFloat(e.target.value) : null
                  }
                })}
                />
                </div>
                <div className="space-y-2">
                <Label>Amount Greater Than</Label>
                <Input
                type="number"
                step="0.01"
                placeholder="e.g., 500.00"
                value={formData.conditions.amount_greater_than || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    amount_greater_than: e.target.value ? parseFloat(e.target.value) : null
                  }
                })}
                />
                </div>
                <div className="space-y-2">
                <Label>Amount Less Than</Label>
                <Input
                type="number"
                step="0.01"
                placeholder="e.g., 1000.00"
                value={formData.conditions.amount_less_than || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    amount_less_than: e.target.value ? parseFloat(e.target.value) : null
                  }
                })}
                />
                </div>
                </div>
                </div>

                <div className="space-y-3 border rounded-lg p-4">
                <h4 className="font-semibold">Actions</h4>
            
            <div className="space-y-2">
              <Label>GL Account *</Label>
              <Select
                value={formData.actions.gl_account_id}
                onValueChange={(v) => setFormData({ ...formData, actions: { ...formData.actions, gl_account_id: v } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
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

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Auto-Post to GL</Label>
                <p className="text-sm text-gray-500">Automatically post matching transactions</p>
              </div>
              <Switch
                checked={formData.actions.auto_post}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, actions: { ...formData.actions, auto_post: checked } })
                }
              />
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