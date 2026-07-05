import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    RoleAccessGuard,
    canAccessCentralStock,
    canAccessCentralStockMaterials,
    canAccessCentralStockProducts,
    readLoggedUser,
} from 'sf-common';
import { StockProductsAvailablePanel } from './StockProductsAvailablePanel';
import { StockMaterialsByLocationPanel } from './StockMaterialsByLocationPanel';

const StockTabs = {
    MATERIALS: 0,
    PRODUCTS: 1,
} as const;

type StockTabId = (typeof StockTabs)[keyof typeof StockTabs];

export function StockHome() {
    const { t } = useTranslation();
    const user = readLoggedUser();

    const showMaterials = canAccessCentralStockMaterials(user);
    const showProducts = canAccessCentralStockProducts(user);

    const defaultTab = useMemo(() => {
        if (showMaterials) return StockTabs.MATERIALS;
        if (showProducts) return StockTabs.PRODUCTS;
        return StockTabs.MATERIALS;
    }, [showMaterials, showProducts]);

    const [activeTab, setActiveTab] = useState<StockTabId>(defaultTab);

    useEffect(() => {
        if (activeTab === StockTabs.MATERIALS && !showMaterials && showProducts) {
            setActiveTab(StockTabs.PRODUCTS);
        } else if (activeTab === StockTabs.PRODUCTS && !showProducts && showMaterials) {
            setActiveTab(StockTabs.MATERIALS);
        }
    }, [activeTab, showMaterials, showProducts]);

    return (
        <RoleAccessGuard user={user} allowed={canAccessCentralStock(user)}>
            <Container>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6">
                            {t('stock')} - {t('welcome')}, {user?.name} {user?.surname}
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                    <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue as StockTabId)}>
                        {showMaterials && <Tab label={t('stockMaterials')} value={StockTabs.MATERIALS} />}
                        {showProducts && <Tab label={t('products')} value={StockTabs.PRODUCTS} />}
                    </Tabs>
                </Box>

                <Box sx={{ py: 4 }}>
                    {activeTab === StockTabs.MATERIALS && showMaterials && <StockMaterialsByLocationPanel />}
                    {activeTab === StockTabs.PRODUCTS && showProducts && <StockProductsAvailablePanel />}
                </Box>
            </Container>
        </RoleAccessGuard>
    );
}
