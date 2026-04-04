import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LoggedUser } from 'work-order-local/src/models/Common.ts';
import { UsersManagementPanel } from './UsersManagementPanel';
import { ProductsManagementPanel } from './ProductsManagementPanel';
import { CustomersManagementPanel } from './CustomersManagementPanel';
import { MachinesManagementPanel } from './MachinesManagementPanel';
import { MiscManagementPanel } from './MiscManagementPanel';
import { LicenseActivationPanel } from './LicenseActivationPanel';

const AdminTabs = {
    CUSTOMERS: 0,
    MACHINES: 1,
    PRODUCTS: 2,
    USERS: 3,
    MISC: 4,
    LICENSE: 5,
} as const;

type AdminTabId = (typeof AdminTabs)[keyof typeof AdminTabs];

export function AdminHome() {
    const { t } = useTranslation();

    const userDataString = sessionStorage.getItem('userData');
    const userData: LoggedUser = userDataString && JSON.parse(userDataString);

    const [activeTab, setActiveTab] = useState<AdminTabId>(AdminTabs.CUSTOMERS);

    return (
        <Container>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">
                        {t('admin')} - {t('welcome')}, {userData.name} {userData.surname}
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue as AdminTabId)}>
                    <Tab label={t('customers')} value={AdminTabs.CUSTOMERS} />
                    <Tab label={t('machines')} value={AdminTabs.MACHINES} />
                    <Tab label={t('products')} value={AdminTabs.PRODUCTS} />
                    <Tab label={t('users')} value={AdminTabs.USERS} />
                    <Tab label={t('misc')} value={AdminTabs.MISC} />
                    <Tab label={t('licenseActivationTab')} value={AdminTabs.LICENSE} />
                </Tabs>
            </Box>

            {activeTab === AdminTabs.USERS && <UsersManagementPanel />}
            {activeTab === AdminTabs.PRODUCTS && <ProductsManagementPanel />}
            {activeTab === AdminTabs.CUSTOMERS && <CustomersManagementPanel />}
            {activeTab === AdminTabs.MACHINES && <MachinesManagementPanel />}
            {activeTab === AdminTabs.MISC && <MiscManagementPanel />}
            {activeTab === AdminTabs.LICENSE && <LicenseActivationPanel />}
        </Container>
    );
}
