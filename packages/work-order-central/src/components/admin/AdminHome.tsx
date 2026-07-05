import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    RoleAccessGuard,
    canAccessCentralAdmin,
    canAccessCentralAdminCatalogOverview,
    canAccessCentralAdminCustomers,
    canAccessCentralAdminMachines,
    canAccessCentralAdminMaterialProviders,
    canAccessCentralAdminProducts,
    canAccessCentralAdminStockLocations,
    canAccessCentralAdminSystem,
    canAccessCentralAdminUsers,
    readLoggedUser,
} from 'sf-common';
import { UsersManagementPanel } from './UsersManagementPanel';
import { ProductsManagementPanel } from './ProductsManagementPanel';
import { CustomersManagementPanel } from './CustomersManagementPanel';
import { MachinesManagementPanel } from './MachinesManagementPanel';
import { MiscManagementPanel } from './MiscManagementPanel';
import { LicenseActivationPanel } from './LicenseActivationPanel';
import { MaterialProvidersManagementPanel } from './MaterialProvidersManagementPanel';
import { CatalogOverviewPanel } from './CatalogOverviewPanel';
import { EmailTemplatesManagementPanel } from './EmailTemplatesManagementPanel';
import { StockLocationsManagementPanel } from './StockLocationsManagementPanel';

const AdminSections = {
    CATALOG_OVERVIEW: 'catalog-overview',
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    MACHINES: 'machines',
    MATERIAL_PROVIDERS: 'material-providers',
    STOCK_LOCATIONS: 'stock-locations',
    USERS: 'users',
    MISC: 'misc',
    EMAIL_TEMPLATES: 'email-templates',
    LICENSE: 'license',
} as const;

type AdminSectionId = (typeof AdminSections)[keyof typeof AdminSections];

function canAccessAdminSection(user: ReturnType<typeof readLoggedUser>, section: AdminSectionId): boolean {
    switch (section) {
        case AdminSections.CATALOG_OVERVIEW:
            return canAccessCentralAdminCatalogOverview(user);
        case AdminSections.PRODUCTS:
            return canAccessCentralAdminProducts(user);
        case AdminSections.CUSTOMERS:
            return canAccessCentralAdminCustomers(user);
        case AdminSections.MACHINES:
            return canAccessCentralAdminMachines(user);
        case AdminSections.MATERIAL_PROVIDERS:
            return canAccessCentralAdminMaterialProviders(user);
        case AdminSections.STOCK_LOCATIONS:
            return canAccessCentralAdminStockLocations(user);
        case AdminSections.USERS:
            return canAccessCentralAdminUsers(user);
        case AdminSections.MISC:
        case AdminSections.EMAIL_TEMPLATES:
        case AdminSections.LICENSE:
            return canAccessCentralAdminSystem(user);
        default:
            return false;
    }
}

export function AdminHome() {
    const { t } = useTranslation();
    const user = readLoggedUser();

    const allowedSections = useMemo(
        () => (Object.values(AdminSections) as AdminSectionId[]).filter((s) => canAccessAdminSection(user, s)),
        [user],
    );

    const [activeSection, setActiveSection] = useState<AdminSectionId>(
        allowedSections[0] ?? AdminSections.CATALOG_OVERVIEW,
    );

    useEffect(() => {
        if (!canAccessAdminSection(user, activeSection) && allowedSections.length > 0) {
            setActiveSection(allowedSections[0]);
        }
    }, [activeSection, allowedSections, user]);

    return (
        <RoleAccessGuard user={user} allowed={canAccessCentralAdmin(user)}>
            <Container>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6">
                            {t('admin')} - {t('welcome')}, {user?.name} {user?.surname}
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 2, mt: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1 }}>
                        <List dense>
                            <ListItemText primary={t('productionCatalog')} sx={{ px: 1, py: 0.5 }} />
                            {canAccessAdminSection(user, AdminSections.CATALOG_OVERVIEW) && (
                                <ListItemButton selected={activeSection === AdminSections.CATALOG_OVERVIEW} onClick={() => setActiveSection(AdminSections.CATALOG_OVERVIEW)}>
                                    <ListItemText primary={t('catalogOverview')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.CUSTOMERS) && (
                                <ListItemButton selected={activeSection === AdminSections.CUSTOMERS} onClick={() => setActiveSection(AdminSections.CUSTOMERS)}>
                                    <ListItemText primary={t('buyers')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.MACHINES) && (
                                <ListItemButton selected={activeSection === AdminSections.MACHINES} onClick={() => setActiveSection(AdminSections.MACHINES)}>
                                    <ListItemText primary={t('machines')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.MATERIAL_PROVIDERS) && (
                                <ListItemButton selected={activeSection === AdminSections.MATERIAL_PROVIDERS} onClick={() => setActiveSection(AdminSections.MATERIAL_PROVIDERS)}>
                                    <ListItemText primary={t('providersAndMaterials')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.PRODUCTS) && (
                                <ListItemButton selected={activeSection === AdminSections.PRODUCTS} onClick={() => setActiveSection(AdminSections.PRODUCTS)}>
                                    <ListItemText primary={t('products')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.STOCK_LOCATIONS) && (
                                <ListItemButton selected={activeSection === AdminSections.STOCK_LOCATIONS} onClick={() => setActiveSection(AdminSections.STOCK_LOCATIONS)}>
                                    <ListItemText primary={t('stockLocations')} />
                                </ListItemButton>
                            )}
                            {canAccessCentralAdminSystem(user) && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <ListItemText primary={t('systemSection')} sx={{ px: 1, py: 0.5 }} />
                                </>
                            )}
                            {canAccessAdminSection(user, AdminSections.USERS) && (
                                <ListItemButton selected={activeSection === AdminSections.USERS} onClick={() => setActiveSection(AdminSections.USERS)}>
                                    <ListItemText primary={t('users')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.MISC) && (
                                <ListItemButton selected={activeSection === AdminSections.MISC} onClick={() => setActiveSection(AdminSections.MISC)}>
                                    <ListItemText primary={t('misc')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.EMAIL_TEMPLATES) && (
                                <ListItemButton selected={activeSection === AdminSections.EMAIL_TEMPLATES} onClick={() => setActiveSection(AdminSections.EMAIL_TEMPLATES)}>
                                    <ListItemText primary={t('emailTemplates')} />
                                </ListItemButton>
                            )}
                            {canAccessAdminSection(user, AdminSections.LICENSE) && (
                                <ListItemButton selected={activeSection === AdminSections.LICENSE} onClick={() => setActiveSection(AdminSections.LICENSE)}>
                                    <ListItemText primary={t('licenseActivationTab')} />
                                </ListItemButton>
                            )}
                        </List>
                    </Paper>

                    <Box>
                        {activeSection === AdminSections.CATALOG_OVERVIEW && (
                            <CatalogOverviewPanel
                                onOpenSection={(section) => {
                                    if (section === 'buyers' && canAccessAdminSection(user, AdminSections.CUSTOMERS)) setActiveSection(AdminSections.CUSTOMERS);
                                    else if (section === 'machines' && canAccessAdminSection(user, AdminSections.MACHINES)) setActiveSection(AdminSections.MACHINES);
                                    else if (section === 'products' && canAccessAdminSection(user, AdminSections.PRODUCTS)) setActiveSection(AdminSections.PRODUCTS);
                                    else if ((section === 'materials' || section === 'providers') && canAccessAdminSection(user, AdminSections.MATERIAL_PROVIDERS)) setActiveSection(AdminSections.MATERIAL_PROVIDERS);
                                }}
                            />
                        )}
                        {activeSection === AdminSections.USERS && <UsersManagementPanel />}
                        {activeSection === AdminSections.PRODUCTS && <ProductsManagementPanel />}
                        {activeSection === AdminSections.MATERIAL_PROVIDERS && <MaterialProvidersManagementPanel />}
                        {activeSection === AdminSections.STOCK_LOCATIONS && <StockLocationsManagementPanel />}
                        {activeSection === AdminSections.CUSTOMERS && <CustomersManagementPanel />}
                        {activeSection === AdminSections.MACHINES && <MachinesManagementPanel />}
                        {activeSection === AdminSections.MISC && <MiscManagementPanel />}
                        {activeSection === AdminSections.EMAIL_TEMPLATES && <EmailTemplatesManagementPanel />}
                        {activeSection === AdminSections.LICENSE && <LicenseActivationPanel />}
                    </Box>
                </Box>
            </Container>
        </RoleAccessGuard>
    );
}
