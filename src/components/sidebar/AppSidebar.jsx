import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CompanySelector from "@/components/shared/CompanySelector";
import { EFIN_LOGO_URL } from "./navigation";

function NavSection({ section, pathname }) {
  const containsActive = section.items.some((item) => pathname === item.url);
  const [open, setOpen] = useState(containsActive || section.id === "overview");

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-1">
      <CollapsibleTrigger
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8FF60]"
        aria-expanded={open}
      >
        {section.label}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-0.5">
        {section.items.map((item) => {
          const active = pathname === item.url;
          const Icon = item.icon;
          return (
            <Link
              key={`${section.id}-${item.pageId}-${item.title}`}
              to={item.url}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8FF60] ${
                active ? "bg-white/10 font-medium text-white" : "text-white/80"
              }`}
            >
              {active && (
                <span className="absolute bottom-1.5 left-0 top-1.5 w-1 rounded-r bg-[#A8FF60]" aria-hidden="true" />
              )}
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AppSidebar({ sections, pathname, newEntryActions, onAddCompany, currentUser, onEditProfile }) {
  return (
    <Sidebar
      className="border-r border-white/10"
      style={{ "--sidebar-background": "218 75% 15%", backgroundColor: "#0A1F44" }}
    >
      <SidebarHeader className="border-b border-white/10 bg-[#0A1F44] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg p-2">
            <img src={EFIN_LOGO_URL} alt="eFinAuto Center Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">eFinAuto OFMS</h2>
            <p className="text-xs text-white/70">Car Dealership & Services</p>
          </div>
        </div>
        <CompanySelector onAddCompany={onAddCompany} />
      </SidebarHeader>

      <SidebarContent className="bg-[#0A1F44] p-3">
        {sections.map((section) => (
          <NavSection key={section.id} section={section} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter className="space-y-3 border-t border-white/10 bg-[#0A1F44] p-4">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#A8FF60] px-4 py-3 text-sm font-semibold text-[#0A1F44] shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              New Entry
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-56 p-2">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#0A1F44]/70">New Entry</p>
            <div className="mt-1 flex flex-col">
              {newEntryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.pageId}
                    to={action.url}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[#0A1F44] hover:bg-[#F5F6F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0A1F44]"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    {action.title}
                  </Link>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={onEditProfile}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8FF60]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A8FF60] text-sm font-semibold text-[#0A1F44]">
            {currentUser?.full_name?.charAt(0).toUpperCase() || "U"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{currentUser?.full_name || "User"}</span>
            <span className="block truncate text-xs text-white/70">{currentUser?.role?.replace(/_/g, " ") || "User"}</span>
          </span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
