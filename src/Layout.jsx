import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Car, 
  Settings, 
  ShoppingCart, 
  Wrench,
  Plane,
  Package,
  Users,
  Building2,
  Trash2,
  Bell,
  BarChart3,
  UserCog,
  HardHat,
  LineChart,
  FileText,
  DollarSign,
  MessageCircle,
  Send,
  Settings as SettingsIcon,
  Shield
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CompanyProvider } from "@/components/shared/CompanyContext";
import CompanySelector from "@/components/shared/CompanySelector";
import ProfileDialog from "@/components/users/ProfileDialog";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const allNavigationItems = [
  {
    title: "Home",
    url: createPageUrl("Landing"),
    icon: LayoutDashboard,
    pageId: "Landing"
  },
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    pageId: "Dashboard"
  },
  {
    title: "Companies",
    url: createPageUrl("Companies"),
    icon: Building2,
    pageId: "Companies"
  },
  {
    title: "Customers",
    url: createPageUrl("Customers"),
    icon: Users,
    pageId: "Customers"
  },
  {
    title: "Vehicles",
    url: createPageUrl("Vehicles"),
    icon: Car,
    pageId: "Vehicles"
  },
  {
    title: "Parts Inventory",
    url: createPageUrl("Parts"),
    icon: Settings,
    pageId: "Parts"
  },
  {
    title: "Inventory Management",
    url: createPageUrl("InventoryManagement"),
    icon: Package,
    pageId: "InventoryManagement"
  },
  {
    title: "Products & Services",
    url: createPageUrl("ProductsServices"),
    icon: Package,
    pageId: "ProductsServices"
  },
  {
    title: "Purchases",
    url: createPageUrl("Purchases"),
    icon: ShoppingCart,
    pageId: "Purchases"
  },
  {
    title: "Sales",
    url: createPageUrl("Sales"),
    icon: ShoppingCart,
    pageId: "Sales"
  },
  {
    title: "Auto Repair",
    url: createPageUrl("Repairs"),
    icon: Wrench,
    pageId: "Repairs"
  },
  {
    title: "Technicians",
    url: createPageUrl("Technicians"),
    icon: HardHat,
    pageId: "Technicians"
  },
  {
    title: "Salvage & Dismantling",
    url: createPageUrl("Salvage"),
    icon: Trash2,
    pageId: "Salvage"
  },
  {
    title: "Global Shipping & Logistics",
    url: createPageUrl("GlobalShipping"),
    icon: Plane,
    pageId: "GlobalShipping"
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
    pageId: "Reports"
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: LineChart,
    pageId: "Analytics"
  },
  {
    title: "Vehicle Analytics",
    url: createPageUrl("VehicleAnalytics"),
    icon: BarChart3,
    pageId: "VehicleAnalytics"
  },
  {
    title: "Financials",
    url: createPageUrl("Accounting"),
    icon: DollarSign,
    pageId: "Accounting"
  },
  {
    title: "Banking",
    url: createPageUrl("Banking"),
    icon: DollarSign,
    pageId: "Banking"
  },
  {
    title: "Mobile Banking",
    url: createPageUrl("BankingMobile"),
    icon: DollarSign,
    pageId: "BankingMobile"
  },
  {
    title: "Payroll & HR",
    url: createPageUrl("Payroll"),
    icon: Users,
    pageId: "Payroll"
  },
  {
    title: "Employee Portal",
    url: createPageUrl("EmployeePortal"),
    icon: UserCog,
    pageId: "EmployeePortal"
  },
  {
    title: "Communications Hub",
    url: createPageUrl("CustomerCommunications"),
    icon: Send,
    pageId: "CustomerCommunications"
  },
  {
    title: "AI Support Chat",
    url: createPageUrl("CustomerSupport"),
    icon: MessageCircle,
    pageId: "CustomerSupport"
  },
  {
    title: "Notifications",
    url: createPageUrl("Notifications"),
    icon: Bell,
    pageId: "Notifications"
  },
  {
    title: "User Management",
    url: createPageUrl("UserManagement"),
    icon: UserCog,
    pageId: "UserManagement"
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: SettingsIcon,
    pageId: "Settings"
  },
  {
    title: "Pricing",
    url: createPageUrl("Pricing"),
    icon: DollarSign,
    pageId: "Pricing"
  },
  {
    title: "AI Assistant",
    url: createPageUrl("FinancialAssistant"),
    icon: MessageCircle,
    pageId: "FinancialAssistant"
  },
  {
    title: "Audit Logs",
    url: createPageUrl("AuditLogs"),
    icon: Shield,
    pageId: "AuditLogs"
  },
  {
    title: "Integration Diagram",
    url: createPageUrl("IntegrationDiagram"),
    icon: BarChart3,
    pageId: "IntegrationDiagram"
  },
  ];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Filter navigation items based on user's accessible modules
  const navigationItems = currentUser?.data?.accessible_modules?.length > 0
    ? allNavigationItems.filter(item => currentUser.data.accessible_modules.includes(item.pageId))
    : allNavigationItems;

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Profile updated successfully");
      setProfileDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to update profile");
    }
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <ErrorBoundary>
      <CompanyProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-gray-50">
          <Sidebar className="border-r border-gray-800" style={{ backgroundColor: '#1e293b' }}>
            <SidebarHeader className="border-b border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center p-2">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png" 
                    alt="eFinAuto Center Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: '#1e293b' }}>eFinAuto OFMS</h2>
                  <p className="text-xs" style={{ color: '#1e293b' }}>Car Dealership & Services</p>
                </div>
              </div>
              <CompanySelector />
            </SidebarHeader>
            
            <SidebarContent className="p-3" style={{ backgroundColor: '#1e293b' }}>
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                  Main Menu
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-gray-700 transition-all duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-300'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-gray-700 p-4" style={{ backgroundColor: '#1e293b' }}>
              <div className="flex items-center gap-3 px-2">
                <button
                  onClick={() => setProfileDialogOpen(true)}
                  className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  title="Edit Profile"
                >
                  <span className="text-white font-semibold text-sm">
                    {currentUser?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setProfileDialogOpen(true)}
                    className="text-left hover:opacity-80 transition-opacity"
                    title="Edit Profile"
                  >
                    <p className="font-semibold text-white text-sm truncate">
                      {currentUser?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-300 truncate">
                      {currentUser?.role?.replace(/_/g, ' ') || 'User'}
                    </p>
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white transition-colors text-xs px-2 py-1 rounded hover:bg-gray-700"
                  title="Logout"
                >
                  Logout
                </button>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col min-h-screen bg-white">
            <header className="bg-white border-b border-gray-200 px-4 py-3 lg:hidden sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
                <div className="w-8 h-8 rounded flex items-center justify-center">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png" 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-base font-bold text-gray-900">eFinAuto OFMS</h1>
              </div>
            </header>

            <div className="flex-1">
              {children}
            </div>
            </main>

            <ProfileDialog
            open={profileDialogOpen}
            onClose={() => setProfileDialogOpen(false)}
            user={currentUser}
            onSave={(data) => updateProfileMutation.mutate(data)}
            isLoading={updateProfileMutation.isPending}
            />
            </div>
            </SidebarProvider>
            </CompanyProvider>
            </ErrorBoundary>
            );
            }