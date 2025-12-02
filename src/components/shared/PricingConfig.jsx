import { Car, Wrench, Package, Plane, DollarSign, Users, Zap, Building2 } from "lucide-react";

export const defaultSubscriptionPlans = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    interval: "month",
    description: "Perfect for small dealerships",
    icon: Zap,
    color: "blue",
    features: [
      "Vehicle Inventory Management",
      "Customer Management",
      "Basic Sales Tracking",
      "Up to 50 vehicles",
      "Email Support"
    ],
    modules: ["Dashboard", "Vehicles", "Customers", "Sales"],
    stripePriceId: "price_starter_monthly",
    popular: false
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    interval: "month",
    description: "For growing dealerships",
    icon: Building2,
    color: "purple",
    features: [
      "Everything in Starter",
      "Auto Repair Shop",
      "Parts Inventory",
      "Exports & Freight",
      "Financial Reports",
      "Up to 200 vehicles",
      "Priority Support"
    ],
    modules: ["Dashboard", "Vehicles", "Customers", "Sales", "Repairs", "Parts", "Exports", "Freight", "Reports"],
    stripePriceId: "price_professional_monthly",
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 349,
    interval: "month",
    description: "Full-featured solution",
    icon: DollarSign,
    color: "amber",
    features: [
      "Everything in Professional",
      "Full Accounting Suite",
      "Payroll & HR",
      "Banking Integration",
      "AI Assistant",
      "Unlimited vehicles",
      "Multi-company support",
      "24/7 Phone Support"
    ],
    modules: ["Dashboard", "Vehicles", "Customers", "Sales", "Repairs", "Parts", "Exports", "Freight", "Reports", "Accounting", "Payroll", "Banking", "FinancialAssistant"],
    stripePriceId: "price_enterprise_monthly",
    popular: false
  }
];

export const defaultModuleCategories = [
  {
    category: "Core Operations",
    modules: [
      { id: "Vehicles", name: "Vehicle Management", icon: Car, price: 19 },
      { id: "Sales", name: "Sales & CRM", icon: DollarSign, price: 29 },
      { id: "Customers", name: "Customer Management", icon: Users, price: 15 },
    ]
  },
  {
    category: "Service & Inventory",
    modules: [
      { id: "Repairs", name: "Auto Repair Shop", icon: Wrench, price: 25 },
      { id: "Parts", name: "Parts Inventory", icon: Package, price: 19 },
      { id: "Technicians", name: "Technician Management", icon: Users, price: 15 },
    ]
  },
  {
    category: "Export & Freight",
    modules: [
      { id: "Exports", name: "Export Management", icon: Plane, price: 35 },
      { id: "Freight", name: "Freight & Cargo", icon: Package, price: 29 },
    ]
  },
  {
    category: "Finance & Accounting",
    modules: [
      { id: "Accounting", name: "Full Accounting Suite", icon: DollarSign, price: 49 },
      { id: "Payroll", name: "Payroll & HR", icon: Users, price: 39 },
      { id: "Banking", name: "Banking Integration", icon: Building2, price: 29 },
      { id: "FinancialAssistant", name: "AI Financial Assistant", icon: Zap, price: 25 },
    ]
  }
];

// Load saved pricing from localStorage, restoring icon references
export function loadSavedPricing() {
  const saved = localStorage.getItem('customPricing');
  if (saved) {
    try {
      const { subscriptionPlans: savedPlans, moduleCategories: savedModules } = JSON.parse(saved);
      
      // Restore icon components for subscription plans
      const restoredPlans = savedPlans ? savedPlans.map((plan, idx) => ({
        ...plan,
        icon: defaultSubscriptionPlans[idx]?.icon || Zap
      })) : defaultSubscriptionPlans;
      
      // Restore icon components for module categories
      const restoredModules = savedModules ? savedModules.map((cat, catIdx) => ({
        ...cat,
        modules: cat.modules.map((mod, modIdx) => ({
          ...mod,
          icon: defaultModuleCategories[catIdx]?.modules[modIdx]?.icon || Package
        }))
      })) : defaultModuleCategories;
      
      return { subscriptionPlans: restoredPlans, moduleCategories: restoredModules };
    } catch (e) {
      console.error("Failed to load saved pricing:", e);
    }
  }
  return { subscriptionPlans: defaultSubscriptionPlans, moduleCategories: defaultModuleCategories };
}

// Save pricing to localStorage
export function savePricing(subscriptionPlans, moduleCategories) {
  localStorage.setItem('customPricing', JSON.stringify({ subscriptionPlans, moduleCategories }));
}