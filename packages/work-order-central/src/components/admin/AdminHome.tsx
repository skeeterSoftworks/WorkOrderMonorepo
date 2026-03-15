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
import { WorkOrdersManagementPanel } from './WorkOrdersManagementPanel';
import { PurchaseOrdersManagementPanel } from './PurchaseOrdersManagementPanel';
import { ProductsManagementPanel } from './ProductsManagementPanel';
import { CustomersManagementPanel } from './CustomersManagementPanel';
import { MachinesManagementPanel } from './MachinesManagementPanel';

// @ts-ignore
enum AdminTabs {
    USERS = 0,
    WORK_ORDERS = 1,
    PURCHASE_ORDERS = 2,
    PRODUCTS = 3,
    CUSTOMERS = 4,
    MACHINES = 5,
}

export function AdminHome() {
    const { t } = useTranslation();

    const userDataString = sessionStorage.getItem('userData');
    const userData: LoggedUser = userDataString && JSON.parse(userDataString);

    const [activeTab, setActiveTab] = useState<AdminTabs>(AdminTabs.USERS);

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
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                >
                    <Tab label={t('users')} value={AdminTabs.USERS} />
                    <Tab label={t('workOrders')} value={AdminTabs.WORK_ORDERS} />
                    <Tab label={t('purchaseOrders')} value={AdminTabs.PURCHASE_ORDERS} />
                    <Tab label={t('products')} value={AdminTabs.PRODUCTS} />
                    <Tab label={t('customers')} value={AdminTabs.CUSTOMERS} />
                    <Tab label={t('machines')} value={AdminTabs.MACHINES} />
                </Tabs>
            </Box>

            {activeTab === AdminTabs.USERS && <UsersManagementPanel />}
            {activeTab === AdminTabs.WORK_ORDERS && <WorkOrdersManagementPanel />}
            {activeTab === AdminTabs.PURCHASE_ORDERS && <PurchaseOrdersManagementPanel />}
            {activeTab === AdminTabs.PRODUCTS && <ProductsManagementPanel />}
            {activeTab === AdminTabs.CUSTOMERS && <CustomersManagementPanel />}
            {activeTab === AdminTabs.MACHINES && <MachinesManagementPanel />}
        </Container>
    );
}
