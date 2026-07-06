import type { LoggedUser } from '../models/Common';

/** Mirrors {@code ERole} on WorkOrderCentral. */
export const APPLICATION_ROLES = [
    'ADMIN',
    'OPERATOR',
    'ADMIN_TECHNOLOGY',
    'ADMIN_STOCK_INBOUND',
    'ADMIN_STOCK_OUTBOUND',
    'ADMIN_PRODUCTION',
    'SALES_ADMIN',
    'PURCHASING_ADMIN',
    'PRODUCTION_PLANNING_ADMIN',
] as const;

export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

export type UserWithRoles = Pick<LoggedUser, 'roles' | 'role' | 'name' | 'surname'> | null | undefined;

export function normalizeUserRoles(user: UserWithRoles): ApplicationRole[] {
    if (!user) {
        return [];
    }
    if (user.roles?.length) {
        return user.roles.filter((r): r is ApplicationRole =>
            (APPLICATION_ROLES as readonly string[]).includes(r));
    }
    if (user.role && (APPLICATION_ROLES as readonly string[]).includes(user.role)) {
        return [user.role as ApplicationRole];
    }
    return [];
}

export function hasAnyRole(user: UserWithRoles, ...roles: ApplicationRole[]): boolean {
    const userRoles = normalizeUserRoles(user);
    if (userRoles.includes('ADMIN')) {
        return true;
    }
    return roles.some((role) => userRoles.includes(role));
}

export function formatUserRolesLabel(user: UserWithRoles, t: (key: string) => string): string {
    const roles = normalizeUserRoles(user);
    if (roles.length === 0) {
        return '—';
    }
    return roles.map((role) => t(`applicationRole_${role}`)).join(', ');
}

export function canUseMockQr(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN');
}

export function canResolveProductionHelp(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_PRODUCTION');
}

// --- work-order-central ---

export function canAccessCentralHome(user: UserWithRoles): boolean {
    return canAccessCentralWorkOrdersHub(user)
        || canAccessCentralStock(user)
        || canAccessCentralAdmin(user)
        || canAccessCentralMonitoring(user);
}

export function canAccessCentralWorkOrdersHub(user: UserWithRoles): boolean {
    return hasAnyRole(
        user,
        'ADMIN',
        'ADMIN_PRODUCTION',
        'SALES_ADMIN',
        'PURCHASING_ADMIN',
        'PRODUCTION_PLANNING_ADMIN',
    );
}

export function canAccessCentralWorkOrdersOverview(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_PRODUCTION', 'PRODUCTION_PLANNING_ADMIN');
}

export function canAccessCentralPurchaseOrders(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'SALES_ADMIN');
}

export function canAccessCentralWorkOrdersManagement(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_PRODUCTION', 'PRODUCTION_PLANNING_ADMIN');
}

export function canAccessCentralProductionPanel(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_PRODUCTION', 'PRODUCTION_PLANNING_ADMIN');
}

export function canAccessCentralPurchasing(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'PURCHASING_ADMIN');
}

export function canAccessCentralStock(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessCentralStockMaterials(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessCentralStockProducts(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessCentralAdmin(user: UserWithRoles): boolean {
    return hasAnyRole(
        user,
        'ADMIN',
        'ADMIN_TECHNOLOGY',
        'ADMIN_STOCK_INBOUND',
        'ADMIN_STOCK_OUTBOUND',
    );
}

export function canAccessCentralAdminCatalogOverview(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_TECHNOLOGY');
}

export function canAccessCentralAdminCustomers(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'SALES_ADMIN');
}

export function canAccessCentralAdminMachines(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_TECHNOLOGY', 'PRODUCTION_PLANNING_ADMIN');
}

export function canAccessCentralAdminMaterialProviders(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_TECHNOLOGY', 'PURCHASING_ADMIN');
}

export function canAccessCentralAdminProducts(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_TECHNOLOGY');
}

export function canAccessCentralAdminStockLocations(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessCentralAdminUsers(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN');
}

export function canAccessCentralAdminSystem(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN');
}

export function canAccessCentralMonitoring(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_PRODUCTION', 'PRODUCTION_PLANNING_ADMIN');
}

// --- stock-local ---

export function canAccessStockLocalHome(user: UserWithRoles): boolean {
    return hasAnyRole(
        user,
        'ADMIN',
        'ADMIN_STOCK_INBOUND',
        'ADMIN_STOCK_OUTBOUND',
        'PURCHASING_ADMIN',
    );
}

export function canAccessStockLocalIncomingMaterial(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'PURCHASING_ADMIN');
}

export function canAccessStockLocalIncomingProducts(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND');
}

export function canAccessStockLocalStock(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessStockLocalStockMaterialsIssue(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessStockLocalStockMaterialsView(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessStockLocalStockProductsIssue(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessStockLocalStockProductsView(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessStockLocalStockOrderHistory(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_STOCK_INBOUND', 'ADMIN_STOCK_OUTBOUND');
}

export function canAccessStockLocalAdmin(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_TECHNOLOGY', 'ADMIN_PRODUCTION', 'PRODUCTION_PLANNING_ADMIN');
}

// --- work-order-local ---

export function canAccessWorkOrderLocalProduction(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'OPERATOR', 'ADMIN_PRODUCTION');
}

export function canAccessWorkOrderLocalQualityInfo(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'OPERATOR', 'ADMIN_TECHNOLOGY', 'ADMIN_PRODUCTION');
}

export function canAccessWorkOrderLocalAdmin(user: UserWithRoles): boolean {
    return hasAnyRole(user, 'ADMIN', 'ADMIN_TECHNOLOGY', 'ADMIN_PRODUCTION', 'PRODUCTION_PLANNING_ADMIN');
}

export function canAccessWorkOrderLocalHome(user: UserWithRoles): boolean {
    return canAccessWorkOrderLocalProduction(user) || canAccessWorkOrderLocalQualityInfo(user);
}
