import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Mail,
  MoreVertical,
  Edit,
  Building2,
  Clock,
  CheckCircle,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import UserInviteDialog from "@/components/users/UserInviteDialog";
import UserEditDialog from "@/components/users/UserEditDialog";

const getRoleBadge = (role) => {
  const roleConfig = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
    manager: { label: 'Manager', color: 'bg-blue-100 text-blue-700' },
    sales: { label: 'Sales', color: 'bg-green-100 text-green-700' },
    technician: { label: 'Technician', color: 'bg-orange-100 text-orange-700' },
    inventory_manager: { label: 'Inventory', color: 'bg-cyan-100 text-cyan-700' },
    accountant: { label: 'Accountant', color: 'bg-pink-100 text-pink-700' },
    user: { label: 'User', color: 'bg-gray-100 text-gray-700' }
  };
  return roleConfig[role] || roleConfig.user;
};

export default function AssignedUsersTab({ companyId, isAdmin }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return await supabase.entities.User.list('-created_date');
    },
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => supabase.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("User updated successfully");
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error("Failed to update user");
      console.error(error);
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId) => supabase.entities.User.update(userId, { company_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("User removed from company");
      setRemoveDialogOpen(false);
      setUserToRemove(null);
    },
    onError: (error) => {
      toast.error("Failed to remove user from company");
      console.error(error);
    }
  });

  const assignedUsers = users
    .filter(user => user.company_id === companyId)
    .filter(user =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assigned Users ({assignedUsers.length})
          </CardTitle>
          {isAdmin && (
            <Button
              onClick={() => setInviteDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 py-8">Loading assigned users...</p>
        ) : assignedUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No assigned users</h3>
            <p className="text-gray-500 text-sm mb-4">
              {isAdmin
                ? "Invite a user to assign them to this company"
                : "There are no users assigned to this company"}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setInviteDialogOpen(true)}
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite First User
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {assignedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-100">
                      <span className="text-white font-semibold text-lg">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    {(() => {
                      const lastActive = new Date(user.updated_date || user.created_date);
                      const hoursSinceActive = (new Date() - lastActive) / (1000 * 60 * 60);
                      return hoursSinceActive < 24 && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"
                          title="Active recently"
                        />
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{user.full_name || 'Unnamed User'}</h4>
                      <Badge className={getRoleBadge(user.role).color}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {getRoleBadge(user.role).label}
                      </Badge>
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {user.company_id && (
                        <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">Assigned</span>
                        </div>
                      )}
                      {user.department && (
                        <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                          {user.department}
                        </div>
                      )}
                      {user.employee_id && (
                        <div className="flex items-center gap-1 text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full">
                          {user.employee_id}
                        </div>
                      )}
                      {user.accessible_modules?.length > 0 && (
                        <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          {user.accessible_modules.length} modules
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1">
                        <Clock className="w-3 h-3" />
                        {new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { setUserToRemove(user); setRemoveDialogOpen(true); }}
                        className="text-red-600"
                        disabled={user.id === currentUser?.id}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Remove from Company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <UserInviteDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        defaultCompanyId={companyId}
      />

      <UserEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSave={(data) => updateUserMutation.mutate({ userId: selectedUser.id, data })}
        isLoading={updateUserMutation.isPending}
      />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.full_name} from this company?
              They will no longer have access to this company's data until reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToRemove && removeUserMutation.mutate(userToRemove.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}