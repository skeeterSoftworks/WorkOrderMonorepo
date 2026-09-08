import { useEffect, useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    RoleAccessGuard,
    canAccessCentralOrdersHistory,
    canAccessCentralOrdersHistoryMaterials,
    canAccessCentralOrdersHistoryProducts,
    readLoggedUser,
} from 'sf-common';
import { OrdersHistoryProductsPanel } from './OrdersHistoryProductsPanel';
import { OrdersHistoryMaterialsPanel } from './OrdersHistoryMaterialsPanel';

const OrdersHistoryTabs = {
    PRODUCTS: 0,
    MATERIALS: 1,
} as const;

type OrdersHistoryTabId = (typeof OrdersHistoryTabs)[keyof typeof OrdersHistoryTabs];

export function OrdersHistoryPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = readLoggedUser();

    const showProducts = canAccessCentralOrdersHistoryProducts(user);
    const showMaterials = canAccessCentralOrdersHistoryMaterials(user);

    const defaultTab = useMemo(() => {
        if (showProducts) return OrdersHistoryTabs.PRODUCTS;
        if (showMaterials) return OrdersHistoryTabs.MATERIALS;
        return OrdersHistoryTabs.PRODUCTS;
    }, [showProducts, showMaterials]);

    const [activeTab, setActiveTab] = useState<OrdersHistoryTabId>(defaultTab);

    useEffect(() => {
        if (activeTab === OrdersHistoryTabs.PRODUCTS && !showProducts && showMaterials) {
            setActiveTab(OrdersHistoryTabs.MATERIALS);
        } else if (activeTab === OrdersHistoryTabs.MATERIALS && !showMaterials && showProducts) {
            setActiveTab(OrdersHistoryTabs.PRODUCTS);
        }
    }, [activeTab, showMaterials, showProducts]);

    return (
        <RoleAccessGuard user={user} allowed={canAccessCentralOrdersHistory(user)}>
            <Container maxWidth="xl">
                <AppBar position="static">
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            onClick={() => navigate('/')}
                            sx={{ mr: 1 }}
                            aria-label={t('backToHome')}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6">
                            {t('ordersHistory')} - {t('welcome')}, {user?.name} {user?.surname}
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                    <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value as OrdersHistoryTabId)}>
                        {showProducts && (
                            <Tab label={t('ordersHistoryProductsTab')} value={OrdersHistoryTabs.PRODUCTS} />
                        )}
                        {showMaterials && (
                            <Tab label={t('ordersHistoryMaterialsTab')} value={OrdersHistoryTabs.MATERIALS} />
                        )}
                    </Tabs>
                </Box>

                <Box sx={{ py: 3 }}>
                    {activeTab === OrdersHistoryTabs.PRODUCTS && showProducts && <OrdersHistoryProductsPanel />}
                    {activeTab === OrdersHistoryTabs.MATERIALS && showMaterials && <OrdersHistoryMaterialsPanel />}
                </Box>
            </Container>
        </RoleAccessGuard>
    );
}
