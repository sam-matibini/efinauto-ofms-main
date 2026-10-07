import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Plane,
  Package,
  Users,
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
  Shield,
  FolderKanban,
  Ship,
  MapPin,
  Truck,
  Navigation,
  Plus,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { canSeeNavItem } from "@/lib/access";

export const EFIN_LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png";

function navItem(title, pageId, icon) {
  return {
    title,
    pageId,
    icon,
    url: createPageUrl(pageId),
  };
}

export const NAV_SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    items: [
      navItem("Home", "Landing", LayoutDashboard),
      navItem("Dashboard", "Dashboard", LayoutDashboard),
      navItem("Customers", "Customers", Users),
    ],
  },
  {
    id: "financial",
    label: "Financial Suite",
    items: [
      navItem("Financials", "Accounting", DollarSign),
      navItem("Financial Reports", "FinancialReports", FileText),
      navItem("Banking", "Banking", DollarSign),
      navItem("Mobile Banking", "BankingMobile", DollarSign),
      navItem("Payroll & HR", "Payroll", Users),
      navItem("Employee Portal", "EmployeePortal", UserCog),
      navItem("Sales", "Sales", ShoppingCart),
      navItem("Purchases", "Purchases", ShoppingCart),
      navItem("Reports", "Reports", BarChart3),
      navItem("Analytics", "Analytics", LineChart),
      navItem("Vehicle Analytics", "VehicleAnalytics", BarChart3),
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      navItem("Inventory Management", "InventoryManagement", Package),
      navItem("Products & Services", "ProductsServices", Package),
      navItem("Project Management", "Projects", FolderKanban),
      navItem("Auto Repair", "Repairs", Wrench),
      navItem("Technicians", "Technicians", HardHat),
      navItem("Salvage & Dismantling", "Salvage", Trash2),
      navItem("Global Shipping & Logistics", "GlobalShipping", Plane),
      navItem("Rate Shopping", "RateShopping", DollarSign),
      navItem("Track Shipment", "TrackShipment", Ship),
      navItem("Customer Tracking", "CustomerTracking", MapPin),
      navItem("Shipment Monitoring", "ShipmentMonitoring", MapPin),
      navItem("Dispatch & Tracking", "DispatchDashboard", Truck),
      navItem("Driver Mobile", "DriverMobile", Navigation),
    ],
  },
  {
    id: "communications",
    label: "Communications",
    items: [
      navItem("Communications Hub", "CustomerCommunications", Send),
      navItem("AI Support Chat", "CustomerSupport", MessageCircle),
      navItem("Notifications", "Notifications", Bell),
      navItem("AI Assistant", "FinancialAssistant", MessageCircle),
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      navItem("Admin Portal", "AdminPortal", Shield),
      navItem("User Management", "UserManagement", UserCog),
      navItem("Audit Logs", "AuditLogs", Shield),
      navItem("Integration Diagram", "IntegrationDiagram", BarChart3),
    ],
  },
  {
    id: "quick",
    label: "Quick Actions",
    items: [
      navItem("New Sale / Invoice", "Sales", Plus),
      navItem("New Customer", "Customers", Users),
      navItem("Employee Portal", "EmployeePortal", UserCog),
    ],
  },
];

export const NEW_ENTRY_ACTIONS = [
  navItem("Sale / Invoice", "Sales", ShoppingCart),
  navItem("Customer", "Customers", Users),
  navItem("Purchase", "Purchases", ShoppingCart),
];

export function visibleSections(sections, allowedPageIds, user) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeNavItem(item, user, allowedPageIds)),
    }))
    .filter((section) => section.items.length > 0);
}
