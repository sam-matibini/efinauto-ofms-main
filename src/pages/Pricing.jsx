import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Loader2, CreditCard, Settings, Pencil, Save, XCircle, Zap, Key } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { loadSavedPricing, savePricing as savePricingToStorage } from "@/components/shared/PricingConfig";
import StripeSettingsDialog from "@/components/pricing/StripeSettingsDialog";

export default function Pricing() {
  const [selectedModules, setSelectedModules] = useState([]);
  const [billingInterval, setBillingInterval] = useState("month");
  const [editMode, setEditMode] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [moduleCategories, setModuleCategories] = useState([]);
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Load pricing from shared config on mount
  useEffect(() => {
    const { subscriptionPlans: plans, moduleCategories: modules } = loadSavedPricing();
    setSubscriptionPlans(plans);
    setModuleCategories(modules);
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => supabase.auth.me(),
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ planId, modules }) => {
      // Update user with subscription info
      await supabase.auth.updateMe({
        subscription_plan: planId,
        accessible_modules: modules,
        subscription_date: new Date().toISOString(),
        subscription_status: 'active'
      });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Subscription activated successfully!");
    },
    onError: () => {
      toast.error("Failed to process subscription");
    }
  });

  const handleSubscribe = async (plan) => {
    subscribeMutation.mutate({ 
      planId: plan.id, 
      modules: plan.modules 
    });
  };

  const handleCustomSubscribe = () => {
    if (selectedModules.length === 0) {
      toast.error("Please select at least one module");
      return;
    }
    subscribeMutation.mutate({
      planId: "custom",
      modules: ["Dashboard", ...selectedModules]
    });
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const calculateModuleTotal = () => {
    return selectedModules.reduce((total, moduleId) => {
      for (const cat of moduleCategories) {
        const mod = cat.modules.find(m => m.id === moduleId);
        if (mod) return total + mod.price;
      }
      return total;
    }, 0);
  };

  const currentPlan = user?.subscription_plan;
  const isAdmin = user?.role === 'admin';

  const updatePlanPrice = (planId, newPrice) => {
    setSubscriptionPlans(prev => prev.map(plan => 
      plan.id === planId ? { ...plan, price: parseFloat(newPrice) || 0 } : plan
    ));
  };

  const updateModulePrice = (categoryIndex, moduleId, newPrice) => {
    setModuleCategories(prev => prev.map((cat, idx) => {
      if (idx === categoryIndex) {
        return {
          ...cat,
          modules: cat.modules.map(mod => 
            mod.id === moduleId ? { ...mod, price: parseFloat(newPrice) || 0 } : mod
          )
        };
      }
      return cat;
    }));
  };

  const savePricing = () => {
    // Save to localStorage for persistence using shared function
    savePricingToStorage(subscriptionPlans, moduleCategories);
    setEditMode(false);
    toast.success("Pricing updated successfully");
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: "from-blue-500 to-blue-600",
      purple: "from-purple-500 to-purple-600",
      amber: "from-amber-500 to-amber-600"
    };
    return colors[color] || colors.blue;
  };

  // Don't render until pricing is loaded
  if (subscriptionPlans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Subscription Plans</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your dealership or build a custom package
          </p>
          
          {currentPlan && (
            <Badge className="mt-4 bg-green-100 text-green-800 text-sm px-4 py-1">
              Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </Badge>
          )}

          {isAdmin && (
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              {editMode ? (
                <>
                  <Button onClick={savePricing} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Prices
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Prices
                  </Button>
                  <Button variant="outline" onClick={() => setStripeDialogOpen(true)}>
                    <Key className="w-4 h-4 mr-2" />
                    Stripe Settings
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingInterval === "month" 
                  ? "bg-white shadow text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingInterval === "year" 
                  ? "bg-white shadow text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Yearly <span className="text-green-600 text-xs ml-1">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {subscriptionPlans.map((plan, index) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            const price = billingInterval === "year" 
              ? Math.round(plan.price * 12 * 0.8) 
              : plan.price;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative h-full flex flex-col ${
                  plan.popular ? 'border-2 border-purple-500 shadow-lg' : 'border border-gray-200'
                } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 right-4 bg-green-600 text-white">
                      Current
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getColorClasses(plan.color)} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      {editMode ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl">$</span>
                          <Input
                            type="number"
                            value={plan.price}
                            onChange={(e) => updatePlanPrice(plan.id, e.target.value)}
                            className="w-24 text-center text-2xl font-bold"
                          />
                          <span className="text-gray-500">/mo</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">${price}</span>
                          <span className="text-gray-500">/{billingInterval}</span>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className={`w-full ${
                        isCurrentPlan 
                          ? 'bg-gray-100 text-gray-600 cursor-not-allowed' 
                          : plan.popular 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                      onClick={() => !isCurrentPlan && handleSubscribe(plan)}
                      disabled={isCurrentPlan || subscribeMutation.isPending}
                    >
                      {subscribeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      {isCurrentPlan ? 'Current Plan' : 'Subscribe Now'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Package Builder */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mx-auto mb-4">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Build Your Own Package</h2>
            <p className="text-gray-600">Select individual modules to create a custom solution</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {moduleCategories.map((category, catIndex) => (
              <Card key={catIndex} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.modules.map((module) => (
                    <div 
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        selectedModules.includes(module.id) 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50 border border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedModules.includes(module.id) 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-gray-300'
                        }`}>
                          {selectedModules.includes(module.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{module.name}</span>
                      </div>
                      {editMode ? (
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <Input
                            type="number"
                            value={module.price}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateModulePrice(catIndex, module.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-center"
                          />
                          <span>/mo</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 font-medium">${module.price}/mo</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedModules.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-gray-600">Selected {selectedModules.length} modules</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${billingInterval === "year" 
                      ? Math.round(calculateModuleTotal() * 12 * 0.8) 
                      : calculateModuleTotal()}
                    <span className="text-lg text-gray-500 font-normal">/{billingInterval}</span>
                  </p>
                </div>
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleCustomSubscribe}
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Subscribe to Selected
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No Setup Fees</h3>
            <p className="text-gray-600 text-sm">Get started immediately with no hidden costs</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Secure Payments</h3>
            <p className="text-gray-600 text-sm">Powered by Stripe for maximum security</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h3>
            <p className="text-gray-600 text-sm">No long-term contracts or commitments</p>
          </div>
        </div>
      </div>

      {/* Stripe Settings Dialog */}
      <StripeSettingsDialog 
        open={stripeDialogOpen} 
        onClose={() => setStripeDialogOpen(false)} 
      />
    </div>
  );
}