import React from "react";
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
  HardHat
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
import { CompanyProvider } from "@/components/shared/CompanyContext";
import CompanySelector from "@/components/shared/CompanySelector";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Companies",
    url: createPageUrl("Companies"),
    icon: Building2,
  },
  {
    title: "Customers",
    url: createPageUrl("Customers"),
    icon: Users,
  },
  {
    title: "Vehicles",
    url: createPageUrl("Vehicles"),
    icon: Car,
  },
  {
    title: "Parts Inventory",
    url: createPageUrl("Parts"),
    icon: Settings,
  },
  {
    title: "Sales",
    url: createPageUrl("Sales"),
    icon: ShoppingCart,
  },
  {
    title: "Auto Repair",
    url: createPageUrl("Repairs"),
    icon: Wrench,
  },
  {
    title: "Technicians",
    url: createPageUrl("Technicians"),
    icon: HardHat,
  },
  {
    title: "Salvage & Dismantling",
    url: createPageUrl("Salvage"),
    icon: Trash2,
  },
  {
    title: "Exports",
    url: createPageUrl("Exports"),
    icon: Plane,
  },
  {
    title: "Freight & Cargo",
    url: createPageUrl("Freight"),
    icon: Package,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
  },
  {
    title: "User Management",
    url: createPageUrl("UserManagement"),
    icon: UserCog,
  },
  {
    title: "Notifications",
    url: createPageUrl("Notifications"),
    icon: Bell,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <CompanyProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full" style={{ backgroundColor: '#FAFAF9' }}>
          <Sidebar className="border-r border-gray-200 bg-white">
            <SidebarHeader className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">eFinAuto Center</h2>
                  <p className="text-xs text-gray-500">Car Dealership & Services</p>
                </div>
              </div>
              <CompanySelector />
            </SidebarHeader>
            
            <SidebarContent className="p-3">
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
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                            location.pathname === item.url ? 'bg-blue-50 text-blue-700 shadow-sm' : ''
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

            <SidebarFooter className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">Admin User</p>
                  <p className="text-xs text-gray-500 truncate">Dealership Manager</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
                <h1 className="text-xl font-bold text-gray-900">eFinAuto Center</h1>
              </div>
            </header>

            <div className="flex-1">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </CompanyProvider>
  );
}