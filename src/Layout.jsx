import { useState } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { CompanyProvider } from "@/components/shared/CompanyContext";
import ProfileDialog from "@/components/users/ProfileDialog";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CompanyDialog from "@/components/shared/CompanyDialog";
import AppSidebar from "@/components/sidebar/AppSidebar";
import AppHeader from "@/components/header/AppHeader";
import { NAV_SECTIONS, NEW_ENTRY_ACTIONS, visibleSections } from "@/components/sidebar/navigation";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, logout } = useAuth();

  const userModules = currentUser?.accessible_modules;
  const sections = visibleSections(NAV_SECTIONS, userModules);
  const newEntryActions = visibleSections(
    [{ id: "new", label: "New Entry", items: NEW_ENTRY_ACTIONS }],
    userModules,
  ).flatMap((section) => section.items);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => supabase.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile updated successfully");
      setProfileDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        name: data.name?.trim(),
        display_name: data.display_name?.trim() || "",
        code: data.code?.trim(),
        dealer_permit_number: data.dealer_permit_number?.trim() || "",
        gst_number: data.gst_number?.trim() || "",
        pst_number: data.pst_number?.trim() || "",
        address: data.address?.trim() || "",
        city: data.city?.trim() || "",
        province: data.province?.trim() || "",
        postal_code: data.postal_code?.trim() || "",
        country: data.country?.trim() || "",
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        tax_id: data.tax_id?.trim() || "",
        contact_person_name: data.contact_person_name?.trim() || "",
        contact_person_title: data.contact_person_title?.trim() || "",
        contact_person_email: data.contact_person_email?.trim() || "",
        contact_person_phone: data.contact_person_phone?.trim() || "",
        logo_url: data.logo_url?.trim() || "",
        status: data.status || "active",
        tax_rates: data.tax_rates
      };
      return await supabase.entities.Company.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created successfully");
      setCompanyDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to create company");
    },
  });

  const handleLogout = () => {
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    logout(false);
  };

  return (
    <ErrorBoundary>
      <CompanyProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-[#F5F6F8]">
            {isAuthenticated && (
              <AppSidebar
                sections={sections}
                pathname={location.pathname}
                newEntryActions={newEntryActions}
                onAddCompany={() => setCompanyDialogOpen(true)}
                currentUser={currentUser}
                onEditProfile={() => setProfileDialogOpen(true)}
              />
            )}

            <main className="flex min-h-screen flex-1 flex-col bg-[#F5F6F8]">
              {isAuthenticated && (
                <AppHeader
                  currentUser={currentUser}
                  onEditProfile={() => setProfileDialogOpen(true)}
                  onLogout={handleLogout}
                />
              )}

              <div className="flex-1">{children}</div>
            </main>

            <ProfileDialog
              open={profileDialogOpen}
              onClose={() => setProfileDialogOpen(false)}
              user={currentUser}
              onSave={(data) => updateProfileMutation.mutate(data)}
              isLoading={updateProfileMutation.isPending}
            />
            <CompanyDialog
              open={companyDialogOpen}
              onClose={() => setCompanyDialogOpen(false)}
              company={null}
              onSave={(data) => createCompanyMutation.mutate(data)}
              isLoading={createCompanyMutation.isPending}
            />
          </div>
        </SidebarProvider>
      </CompanyProvider>
    </ErrorBoundary>
  );
}
