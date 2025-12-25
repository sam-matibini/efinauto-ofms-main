import { 
  LayoutDashboard, Car, Wrench, DollarSign, Package, 
  Plane, UserCog, BarChart3, Settings, Users, Send, MessageCircle, Bell, Globe,
  FolderKanban, FileText, Landmark, Shield, Trash2, HardHat, LineChart, Brain
} from "lucide-react";

export const defaultSubscriptionPlans = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small dealerships",
    price: 49,
    interval: "month",
    popular: false,
    icon: Car,
    color: "blue",
    features: [
      "Vehicle Inventory Management",
      "Sales Tracking",
      "Customer Database",
      "Basic Reports",
      "Email Support"
    ],
    modules: ["Dashboard", "Vehicles", "Sales", "Customers"]
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing dealerships",
    price: 149,
    interval: "month",
    popular: true,
    icon: Wrench,
    color: "purple",
    features: [
      "All Starter features",
      "Advanced Inventory Management",
      "Auto Repair Module",
      "Global Shipping & Logistics",
      "Financial Reports",
      "Customer Communications Hub",
      "Unlimited users"
    ],
    modules: ["Dashboard", "Vehicles", "Sales", "Parts", "Repairs", "GlobalShipping", "Customers", "Reports", "CustomerCommunications"]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For multi-location operations",
    price: 299,
    interval: "month",
    popular: false,
    icon: LayoutDashboard,
    color: "amber",
    features: [
      "All Professional features",
      "Multi-company Management",
      "Payroll & HR Module",
      "Banking & Reconciliation",
      "AI Financial Assistant",
      "Custom Integrations",
      "Priority Support",
      "Dedicated Account Manager"
    ],
    modules: ["Dashboard", "Companies", "Vehicles", "Sales", "Parts", "Repairs", "GlobalShipping", "Salvage", "Customers", "Reports", "Analytics", "VehicleAnalytics", "Accounting", "FinancialReports", "Payroll", "Banking", "CustomerCommunications", "CustomerSupport", "Notifications", "UserManagement", "Settings", "FinancialAssistant", "Projects", "InventoryManagement", "ProductsServices", "Technicians", "AuditLogs"]
  }
];

export const defaultModuleCategories = [
  {
    category: "Core Operations",
    modules: [
      { id: "Dashboard", name: "Dashboard", icon: LayoutDashboard, price: 0 },
      { id: "Vehicles", name: "Vehicle Management", icon: Car, price: 19 },
      { id: "Sales", name: "Sales & Invoicing", icon: DollarSign, price: 29 },
      { id: "Customers", name: "Customer Management", icon: Users, price: 15 },
    ]
  },
  {
    category: "Service & Inventory",
    modules: [
      { id: "Repairs", name: "Auto Repair Shop", icon: Wrench, price: 25 },
      { id: "Parts", name: "Parts Inventory", icon: Package, price: 19 },
      { id: "Technicians", name: "Technician Management", icon: HardHat, price: 15 },
      { id: "ProductsServices", name: "Products & Services", icon: Package, price: 19 },
    ]
  },
  {
    category: "Global Operations",
    modules: [
      { id: "GlobalShipping", name: "Global Shipping & Logistics", icon: Globe, price: 79 },
      { id: "Salvage", name: "Salvage & Dismantling", icon: Trash2, price: 29 },
      { id: "InventoryManagement", name: "Inventory Management", icon: Package, price: 35 },
    ]
  },
  {
    category: "Project Management",
    modules: [
      { id: "Projects", name: "Project Management", icon: FolderKanban, price: 39 },
    ]
  },
  {
    category: "Finance & Accounting",
    modules: [
      { id: "Accounting", name: "Full Accounting Suite", icon: DollarSign, price: 49 },
      { id: "FinancialReports", name: "Financial Reports", icon: FileText, price: 29 },
      { id: "Payroll", name: "Payroll & HR", icon: Users, price: 39 },
      { id: "Banking", name: "Banking Integration", icon: Landmark, price: 29 },
      { id: "FinancialAssistant", name: "AI Financial Assistant", icon: Brain, price: 25 },
    ]
  },
  {
    category: "Communication & Analytics",
    modules: [
      { id: "CustomerCommunications", name: "Communications Hub", icon: Send, price: 19 },
      { id: "CustomerSupport", name: "AI Support Chat", icon: MessageCircle, price: 29 },
      { id: "Notifications", name: "Notifications", icon: Bell, price: 9 },
      { id: "Reports", name: "Reports", icon: BarChart3, price: 15 },
      { id: "Analytics", name: "Analytics", icon: LineChart, price: 25 },
      { id: "VehicleAnalytics", name: "Vehicle Analytics", icon: BarChart3, price: 19 },
    ]
  },
  {
    category: "Administration",
    modules: [
      { id: "Companies", name: "Multi-Company Management", icon: LayoutDashboard, price: 49 },
      { id: "UserManagement", name: "User Management", icon: UserCog, price: 15 },
      { id: "AuditLogs", name: "Audit Logs", icon: Shield, price: 19 },
      { id: "Settings", name: "Settings", icon: Settings, price: 0 },
    ]
  }
];

// Load saved pricing from localStorage, restoring icon references
export function loadSavedPricing() {
  const saved = localStorage.getItem('customPricing');
  if (saved) {
    try {
      const { subscriptionPlans: savedPlans, moduleCategories: savedModules } = JSON.parse(saved);
      
      // Always restore icon components from defaults to avoid missing icon errors
      const restoredPlans = savedPlans ? savedPlans.map((plan) => {
        const defaultPlan = defaultSubscriptionPlans.find(p => p.id === plan.id);
        return {
          ...plan,
          icon: defaultPlan?.icon || LayoutDashboard
        };
      }) : defaultSubscriptionPlans;
      
      // Restore icon components for module categories
      const restoredModules = savedModules ? savedModules.map((cat) => ({
        ...cat,
        modules: cat.modules.map((mod) => {
          // Find the default module by ID across all categories
          let defaultIcon = Package;
          for (const defaultCat of defaultModuleCategories) {
            const defaultMod = defaultCat.modules.find(m => m.id === mod.id);
            if (defaultMod?.icon) {
              defaultIcon = defaultMod.icon;
              break;
            }
          }
          return {
            ...mod,
            icon: defaultIcon
          };
        })
      })) : defaultModuleCategories;
      
      return { subscriptionPlans: restoredPlans, moduleCategories: restoredModules };
    } catch (e) {
      console.error("Failed to load saved pricing:", e);
      // If parsing fails, clear corrupted data and return defaults
      localStorage.removeItem('customPricing');
    }
  }
  return { subscriptionPlans: defaultSubscriptionPlans, moduleCategories: defaultModuleCategories };
}

// Save pricing to localStorage
export function savePricing(subscriptionPlans, moduleCategories) {
  localStorage.setItem('customPricing', JSON.stringify({ subscriptionPlans, moduleCategories }));
}