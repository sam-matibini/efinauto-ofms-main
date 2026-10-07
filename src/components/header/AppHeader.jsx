import { LogOut, UserRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EFIN_LOGO_URL } from "@/components/sidebar/navigation";

export default function AppHeader({ currentUser, onEditProfile, onLogout }) {
  const initial = currentUser?.full_name?.charAt(0).toUpperCase() || "U";

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 text-white"
      style={{ background: "linear-gradient(100deg, #0A1F44 0%, #1a335c 55%, #8d97a8 100%)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="text-white hover:bg-white/10 hover:text-white" aria-label="Toggle sidebar" />
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg p-2">
          <img src={EFIN_LOGO_URL} alt="eFinAuto Center Logo" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight">eFinAuto OFMS</p>
          <p className="hidden truncate text-xs text-white/75 sm:block">Car Dealership & Services</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 transition-colors duration-200 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8FF60]"
          aria-label="Open profile menu"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A8FF60] text-sm font-semibold text-[#0A1F44]">
            {initial}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
            {currentUser?.full_name || "User"}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{currentUser?.full_name || "User"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEditProfile}>
            <UserRound className="h-4 w-4" strokeWidth={1.75} />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
