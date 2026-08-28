


export function createPageUrl(pageName: string) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

export const CUSTOMER_MANAGER_ROLES = ['admin', 'manager'];

export function canManageCustomers(user) {
    return CUSTOMER_MANAGER_ROLES.includes(user?.role);
}