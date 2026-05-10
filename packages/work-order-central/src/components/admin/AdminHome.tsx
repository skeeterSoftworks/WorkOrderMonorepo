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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LoggedUser } from 'work-order-local/src/models/Common.ts';
import { UsersManagementPanel } from './UsersManagementPanel';
import { ProductsManagementPanel } from './ProductsManagementPanel';
import { CustomersManagementPanel } from './CustomersManagementPanel';
import { MachinesManagementPanel } from './MachinesManagementPanel';
import { MiscManagementPanel } from './MiscManagementPanel';
import { LicenseActivationPanel } from './LicenseActivationPanel';
import { MaterialProvidersManagementPanel } from './MaterialProvidersManagementPanel';
import { CatalogOverviewPanel } from './CatalogOverviewPanel';
import { EmailTemplatesManagementPanel } from './EmailTemplatesManagementPanel';

const AdminSections = {
    CATALOG_OVERVIEW: 'catalog-overview',
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    MACHINES: 'machines',
    MATERIAL_PROVIDERS: 'material-providers',
    USERS: 'users',
    MISC: 'misc',
    EMAIL_TEMPLATES: 'email-templates',
    LICENSE: 'license',
} as const;

type AdminSectionId = (typeof AdminSections)[keyof typeof AdminSections];

export function AdminHome() {
    const { t } = useTranslation();

    const userDataString = sessionStorage.getItem('userData');
    const userData: LoggedUser = userDataString && JSON.parse(userDataString);

    const [activeSection, setActiveSection] = useState<AdminSectionId>(AdminSections.CATALOG_OVERVIEW);

    return (
        <Container>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">
                        {t('admin')} - {t('welcome')}, {userData.name} {userData.surname}
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 2, mt: 2 }}>
                <Paper variant="outlined" sx={{ p: 1 }}>
                    <List dense>
                        <ListItemText primary={t('productionCatalog')} sx={{ px: 1, py: 0.5 }} />
                        <ListItemButton selected={activeSection === AdminSections.CATALOG_OVERVIEW} onClick={() => setActiveSection(AdminSections.CATALOG_OVERVIEW)}>
                            <ListItemText primary={t('catalogOverview')} />
                        </ListItemButton>
                        <ListItemButton selected={activeSection === AdminSections.CUSTOMERS} onClick={() => setActiveSection(AdminSections.CUSTOMERS)}>
                            <ListItemText primary={t('buyers')} />
                        </ListItemButton>
                        <ListItemButton selected={activeSection === AdminSections.MACHINES} onClick={() => setActiveSection(AdminSections.MACHINES)}>
                            <ListItemText primary={t('machines')} />
                        </ListItemButton>
                        <ListItemButton selected={activeSection === AdminSections.MATERIAL_PROVIDERS} onClick={() => setActiveSection(AdminSections.MATERIAL_PROVIDERS)}>
                            <ListItemText primary={t('providersAndMaterials')} />
                        </ListItemButton>
                        <ListItemButton selected={activeSection === AdminSections.PRODUCTS} onClick={() => setActiveSection(AdminSections.PRODUCTS)}>
                            <ListItemText primary={t('products')} />
                        </ListItemButton>
                        <Divider sx={{ my: 1 }} />
                        <ListItemText primary={t('systemSection')} sx={{ px: 1, py: 0.5 }} />
                        <ListItemButton selected={activeSection === AdminSections.USERS} onClick={() => setActiveSection(AdminSections.USERS)}>
                            <ListItemText primary={t('users')} />
                        </ListItemButton>
                        <ListItemButton selected={activeSection === AdminSections.MISC} onClick={() => setActiveSection(AdminSections.MISC)}>
                            <ListItemText primary={t('misc')} />
                        </ListItemButton>
                        <ListItemButton
                            selected={activeSection === AdminSections.EMAIL_TEMPLATES}
                            onClick={() => setActiveSection(AdminSections.EMAIL_TEMPLATES)}
                        >
                            <ListItemText primary={t('emailTemplates')} />
                        </ListItemButton>
                        <ListItemButton selected={activeSection === AdminSections.LICENSE} onClick={() => setActiveSection(AdminSections.LICENSE)}>
                            <ListItemText primary={t('licenseActivationTab')} />
                        </ListItemButton>
                    </List>
                </Paper>

                <Box>
                    {activeSection === AdminSections.CATALOG_OVERVIEW && (
                        <CatalogOverviewPanel
                            onOpenSection={(section) => {
                                if (section === 'buyers') setActiveSection(AdminSections.CUSTOMERS);
                                else if (section === 'machines') setActiveSection(AdminSections.MACHINES);
                                else if (section === 'products') setActiveSection(AdminSections.PRODUCTS);
                                else if (section === 'materials') setActiveSection(AdminSections.MATERIAL_PROVIDERS);
                                else if (section === 'providers') setActiveSection(AdminSections.MATERIAL_PROVIDERS);
                            }}
                        />
                    )}
                    {activeSection === AdminSections.USERS && <UsersManagementPanel />}
                    {activeSection === AdminSections.PRODUCTS && <ProductsManagementPanel />}
                    {activeSection === AdminSections.MATERIAL_PROVIDERS && <MaterialProvidersManagementPanel />}
                    {activeSection === AdminSections.CUSTOMERS && <CustomersManagementPanel />}
                    {activeSection === AdminSections.MACHINES && <MachinesManagementPanel />}
                    {activeSection === AdminSections.MISC && <MiscManagementPanel />}
                    {activeSection === AdminSections.EMAIL_TEMPLATES && <EmailTemplatesManagementPanel />}
                    {activeSection === AdminSections.LICENSE && <LicenseActivationPanel />}
                </Box>
            </Box>
        </Container>
    );
}
