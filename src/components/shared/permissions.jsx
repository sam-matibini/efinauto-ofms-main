// Role-based permissions configuration
export const ROLES = {
  ADMINISTRATOR: 'administrator',
  MANAGER: 'manager',
  SALES_REPRESENTATIVE: 'sales_representative',
  TECHNICIAN: 'technician',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager',
  READ_ONLY: 'read_only'
};

export const MODULES = {
  DASHBOARD: 'dashboard',
  COMPANIES: 'companies',
  CUSTOMERS: 'customers',
  VEHICLES: 'vehicles',
  PARTS: 'parts',
  PURCHASES: 'purchases',
  SALES: 'sales',
  REPAIRS: 'repairs',
  TECHNICIANS: 'technicians',
  SALVAGE: 'salvage',
  EXPORTS: 'exports',
  FREIGHT: 'freight',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  ACCOUNTING: 'accounting',
  USER_MANAGEMENT: 'user_management',
  NOTIFICATIONS: 'notifications'
};

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export'
};

// Define permissions for each role
export const ROLE_PERMISSIONS = {
  [ROLES.ADMINISTRATOR]: {
    // Full access to everything
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.COMPANIES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.VEHICLES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.PARTS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.PURCHASES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.SALES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.REPAIRS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.TECHNICIANS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.SALVAGE]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.EXPORTS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.FREIGHT]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.REPORTS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.ANALYTICS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.ACCOUNTING]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.USER_MANAGEMENT]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.NOTIFICATIONS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]
  },
  
  [ROLES.MANAGER]: {
    // Can manage most operations but not user management
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.COMPANIES]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.VEHICLES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.PARTS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.PURCHASES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.SALES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.REPAIRS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.TECHNICIANS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [MODULES.SALVAGE]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.EXPORTS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.FREIGHT]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.REPORTS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.ANALYTICS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.ACCOUNTING]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.USER_MANAGEMENT]: [ACTIONS.VIEW],
    [MODULES.NOTIFICATIONS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT]
  },
  
  [ROLES.SALES_REPRESENTATIVE]: {
    // Focus on sales, customers, vehicles
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.EXPORT],
    [MODULES.VEHICLES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.EXPORT],
    [MODULES.SALES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.EXPORT],
    [MODULES.EXPORTS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.EXPORT],
    [MODULES.FREIGHT]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [MODULES.REPORTS]: [ACTIONS.VIEW],
    [MODULES.NOTIFICATIONS]: [ACTIONS.VIEW]
  },
  
  [ROLES.TECHNICIAN]: {
    // Focus on repairs, parts, and related services
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW],
    [MODULES.VEHICLES]: [ACTIONS.VIEW],
    [MODULES.PARTS]: [ACTIONS.VIEW, ACTIONS.EDIT],
    [MODULES.REPAIRS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [MODULES.SALVAGE]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [MODULES.NOTIFICATIONS]: [ACTIONS.VIEW]
  },
  
  [ROLES.ACCOUNTANT]: {
    // Focus on financial operations
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.PURCHASES]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.SALES]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.REPAIRS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.EXPORTS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.FREIGHT]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.REPORTS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.ANALYTICS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.ACCOUNTING]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.EXPORT],
    [MODULES.NOTIFICATIONS]: [ACTIONS.VIEW]
  },
  
  [ROLES.INVENTORY_MANAGER]: {
    // Focus on inventory management
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.VEHICLES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.EXPORT],
    [MODULES.PARTS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT],
    [MODULES.PURCHASES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.EXPORT],
    [MODULES.SALVAGE]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.REPORTS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.NOTIFICATIONS]: [ACTIONS.VIEW]
  },
  
  [ROLES.READ_ONLY]: {
    // View-only access to most modules
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW],
    [MODULES.VEHICLES]: [ACTIONS.VIEW],
    [MODULES.PARTS]: [ACTIONS.VIEW],
    [MODULES.PURCHASES]: [ACTIONS.VIEW],
    [MODULES.SALES]: [ACTIONS.VIEW],
    [MODULES.REPAIRS]: [ACTIONS.VIEW],
    [MODULES.TECHNICIANS]: [ACTIONS.VIEW],
    [MODULES.SALVAGE]: [ACTIONS.VIEW],
    [MODULES.EXPORTS]: [ACTIONS.VIEW],
    [MODULES.FREIGHT]: [ACTIONS.VIEW],
    [MODULES.REPORTS]: [ACTIONS.VIEW],
    [MODULES.ANALYTICS]: [ACTIONS.VIEW],
    [MODULES.ACCOUNTING]: [ACTIONS.VIEW],
    [MODULES.NOTIFICATIONS]: [ACTIONS.VIEW]
  }
};

// Role display information
export const ROLE_INFO = {
  [ROLES.ADMINISTRATOR]: {
    label: 'Administrator',
    description: 'Full system access including user management and system configuration',
    color: 'bg-purple-100 text-purple-700'
  },
  [ROLES.MANAGER]: {
    label: 'Manager',
    description: 'Manage company operations, staff, and access to most modules',
    color: 'bg-blue-100 text-blue-700'
  },
  [ROLES.SALES_REPRESENTATIVE]: {
    label: 'Sales Representative',
    description: 'Handle sales, customers, vehicles, and export operations',
    color: 'bg-green-100 text-green-700'
  },
  [ROLES.TECHNICIAN]: {
    label: 'Technician',
    description: 'Manage repairs, service orders, and parts inventory',
    color: 'bg-orange-100 text-orange-700'
  },
  [ROLES.ACCOUNTANT]: {
    label: 'Accountant',
    description: 'Access to financial reports, transactions, and accounting modules',
    color: 'bg-emerald-100 text-emerald-700'
  },
  [ROLES.INVENTORY_MANAGER]: {
    label: 'Inventory Manager',
    description: 'Manage parts, vehicles inventory, and purchase orders',
    color: 'bg-cyan-100 text-cyan-700'
  },
  [ROLES.READ_ONLY]: {
    label: 'Read-Only User',
    description: 'View-only access to all data without editing capabilities',
    color: 'bg-gray-100 text-gray-700'
  }
};

// Check if user has permission
export function hasPermission(userRole, module, action) {
  if (!userRole || !module) return false;
  
  // Admin always has access
  if (userRole === ROLES.ADMINISTRATOR || userRole === 'admin') return true;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;
  
  const modulePermissions = rolePermissions[module];
  if (!modulePermissions) return false;
  
  return modulePermissions.includes(action);
}

// Check if user can access a module at all
export function canAccessModule(userRole, module) {
  if (!userRole || !module) return false;
  
  // Admin always has access
  if (userRole === ROLES.ADMINISTRATOR || userRole === 'admin') return true;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;
  
  return !!rolePermissions[module];
}

// Get all accessible modules for a role
export function getAccessibleModules(userRole) {
  if (!userRole) return [];
  
  // Admin has access to all
  if (userRole === ROLES.ADMINISTRATOR || userRole === 'admin') {
    return Object.values(MODULES);
  }
  
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return [];
  
  return Object.keys(rolePermissions);
}