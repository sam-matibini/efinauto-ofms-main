import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Search, 
  Shield, 
  Users, 
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  Clock,
  CheckCircle,
  Activity,
  Filter,
  SortAsc
} from "lucide-react";
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
import { toast } from "sonner";
import UserInviteDialog from "@/components/users/UserInviteDialog";
import UserEditDialog from "@/components/users/UserEditDialog";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // "all" or "users_only"
  const [roleFilter, setRoleFilter] = useState("all"); // "all", "admin", "regular"
  const [sortBy, setSortBy] = useState("recent"); // "recent", "name", "company"
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => supabase.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return await supabase.entities.User.list('-created_date');
    },
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => supabase.entities.Company.list(),
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

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => supabase.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete user");
      console.error(error);
    }
  });

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

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company?.display_name || company?.name || 'No Company';
  };

  let filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply role filter
  if (roleFilter === 'admin') {
    filteredUsers = filteredUsers.filter(u => u.role === 'admin');
  } else if (roleFilter === 'regular') {
    filteredUsers = filteredUsers.filter(u => u.role !== 'admin');
  }

  // Apply active filter
  if (showActiveOnly) {
    filteredUsers = filteredUsers.filter(user => {
      const lastActive = new Date(user.updated_date || user.created_date);
      const daysSinceActive = (new Date() - lastActive) / (1000 * 60 * 60 * 24);
      return daysSinceActive < 30;
    });
  }

  // Apply sorting
  filteredUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.full_name || '').localeCompare(b.full_name || '');
    } else if (sortBy === 'company') {
      return getCompanyName(a.data?.company_id).localeCompare(getCompanyName(b.data?.company_id));
    } else {
      return new Date(b.created_date) - new Date(a.created_date);
    }
  });

  const adminUsers = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Access Denied</h3>
                <p className="text-sm text-red-700">You don't have permission to access user management.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-sm text-gray-300 mt-1">Manage users and permissions</p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>
      
      <div className="p-6 space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${roleFilter === 'all' ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}
          onClick={() => setRoleFilter('all')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <h3 className="text-3xl font-bold text-gray-900">{users.length}</h3>
                <p className="text-xs text-gray-500 mt-1">All system users</p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${roleFilter === 'all' ? 'bg-blue-600' : 'bg-blue-100'}`}>
                <Users className={`w-7 h-7 ${roleFilter === 'all' ? 'text-white' : 'text-blue-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${roleFilter === 'admin' ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}`}
          onClick={() => setRoleFilter('admin')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Administrators</p>
                <h3 className="text-3xl font-bold text-gray-900">{adminUsers.length}</h3>
                <p className="text-xs text-gray-500 mt-1">Full access</p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${roleFilter === 'admin' ? 'bg-purple-600' : 'bg-purple-100'}`}>
                <Shield className={`w-7 h-7 ${roleFilter === 'admin' ? 'text-white' : 'text-purple-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${roleFilter === 'regular' ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-md'}`}
          onClick={() => setRoleFilter('regular')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Regular Users</p>
                <h3 className="text-3xl font-bold text-gray-900">{regularUsers.length}</h3>
                <p className="text-xs text-gray-500 mt-1">Standard access</p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${roleFilter === 'regular' ? 'bg-green-600' : 'bg-green-100'}`}>
                <Users className={`w-7 h-7 ${roleFilter === 'regular' ? 'text-white' : 'text-green-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-700 font-medium">Active Today</p>
                <h3 className="text-3xl font-bold text-indigo-900">
                  {users.filter(u => {
                    const lastActive = new Date(u.updated_date || u.created_date);
                    const today = new Date();
                    return lastActive.toDateString() === today.toDateString();
                  }).length}
                </h3>
                <p className="text-xs text-indigo-600 mt-1">Recent activity</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center">
                <Activity className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline"
                onClick={() => setSortBy(sortBy === 'recent' ? 'name' : sortBy === 'name' ? 'company' : 'recent')}
                size="sm"
              >
                <SortAsc className="w-4 h-4 mr-2" />
                {sortBy === 'recent' ? 'Recent' : sortBy === 'name' ? 'Name' : 'Company'}
              </Button>
              <Button 
                variant={showActiveOnly ? "default" : "outline"}
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={showActiveOnly ? "bg-green-600 hover:bg-green-700" : ""}
                size="sm"
              >
                <Activity className="w-4 h-4 mr-2" />
                {showActiveOnly ? "Active Only" : "All Users"}
              </Button>
              <Button 
                variant={viewMode === "users_only" ? "default" : "outline"}
                onClick={() => setViewMode(viewMode === "all" ? "users_only" : "all")}
                className={viewMode === "users_only" ? "bg-blue-600 hover:bg-blue-700" : ""}
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                {viewMode === "all" ? "Users Only" : "All Roles"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {viewMode === "users_only" ? "Users Only" : "All Users"} ({filteredUsers.length})
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Sorted by: {sortBy === 'recent' ? 'Most Recent' : sortBy === 'name' ? 'Name (A-Z)' : 'Company'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No users found</p>
          ) : (
            <div className="space-y-3">
              {(viewMode === "users_only" ? filteredUsers.filter(u => u.role === 'user') : filteredUsers).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
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
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" 
                               title="Active recently" />
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
                        {user.data?.company_id && (
                          <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{getCompanyName(user.data.company_id)}</span>
                          </div>
                        )}
                        {user.data?.department && (
                          <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                            {user.data.department}
                          </div>
                        )}
                        {user.data?.accessible_modules?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            {user.data.accessible_modules.length} modules
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1">
                          <Clock className="w-3 h-3" />
                          {new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(user)}
                        className="text-red-600"
                        disabled={user.id === currentUser?.id}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserInviteDialog 
        open={inviteDialogOpen} 
        onClose={() => setInviteDialogOpen(false)}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>
          </div>
          </div>
          );
          }