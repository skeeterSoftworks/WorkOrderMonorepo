import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    RoleAccessGuard,
    canAccessStockLocalStock,
    canAccessStockLocalStockMaterialsIssue,
    canAccessStockLocalStockMaterialsView,
    canAccessStockLocalStockOrderHistory,
    canAccessStockLocalStockProductsIssue,
    canAccessStockLocalStockProductsView,
    readLoggedUser,
} from 'sf-common';
import { StockMaterialsByLocationPanel } from './StockMaterialsByLocationPanel';
import { MaterialAssignmentFulfillPanel } from './MaterialAssignmentFulfillPanel';
import { StockProductsAvailablePanel } from './StockProductsAvailablePanel';
import { StockAssignmentFulfillPanel } from './StockAssignmentFulfillPanel';
import { StockOrderHistoryPanel } from './StockOrderHistoryPanel';

const StockTabs = {
    MATERIALS: 0,
    PRODUCTS: 1,
    ORDER_HISTORY: 2,
} as const;

type StockTabId = (typeof StockTabs)[keyof typeof StockTabs];

export function StockPage() {
    const { t } = useTranslation();
    const user = readLoggedUser();
    const showMaterials = canAccessStockLocalStockMaterialsView(user) || canAccessStockLocalStockMaterialsIssue(user);
    const showProducts = canAccessStockLocalStockProductsView(user) || canAccessStockLocalStockProductsIssue(user);
    const showOrderHistory = canAccessStockLocalStockOrderHistory(user);

    const defaultTab = useMemo(() => {
        if (showMaterials) return StockTabs.MATERIALS;
        if (showProducts) return StockTabs.PRODUCTS;
        if (showOrderHistory) return StockTabs.ORDER_HISTORY;
        return StockTabs.MATERIALS;
    }, [showMaterials, showProducts, showOrderHistory]);

    const [activeTab, setActiveTab] = useState<StockTabId>(defaultTab);
    const [productsRefreshKey, setProductsRefreshKey] = useState(0);
    const [materialsRefreshKey, setMaterialsRefreshKey] = useState(0);

    useEffect(() => {
        const allowed = [
            showMaterials ? StockTabs.MATERIALS : null,
            showProducts ? StockTabs.PRODUCTS : null,
            showOrderHistory ? StockTabs.ORDER_HISTORY : null,
        ].filter((v): v is StockTabId => v != null);
        if (!allowed.includes(activeTab) && allowed.length > 0) {
            setActiveTab(allowed[0]);
        }
    }, [activeTab, showMaterials, showProducts, showOrderHistory]);

    return (
        <RoleAccessGuard user={user} allowed={canAccessStockLocalStock(user)}>
            <Box sx={{ py: 2 }}>
                <Typography variant="h5" component="h1" gutterBottom>
                    {t('stock')}
                </Typography>
                <Button component={RouterLink} to="/" sx={{ mb: 2 }}>
                    {t('backToHome')}
                </Button>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value as StockTabId)}>
                        {showMaterials && <Tab label={t('stockMaterials')} value={StockTabs.MATERIALS} />}
                        {showProducts && <Tab label={t('products')} value={StockTabs.PRODUCTS} />}
                        {showOrderHistory && <Tab label={t('stockOrderHistoryTab')} value={StockTabs.ORDER_HISTORY} />}
                    </Tabs>
                </Box>

                {activeTab === StockTabs.MATERIALS && showMaterials && (
                    <>
                        {canAccessStockLocalStockMaterialsIssue(user) && (
                            <MaterialAssignmentFulfillPanel onFulfilled={() => setMaterialsRefreshKey((k) => k + 1)} />
                        )}
                        {canAccessStockLocalStockMaterialsView(user) && (
                            <StockMaterialsByLocationPanel refreshKey={materialsRefreshKey} />
                        )}
                    </>
                )}
                {activeTab === StockTabs.PRODUCTS && showProducts && (
                    <>
                        {canAccessStockLocalStockProductsIssue(user) && (
                            <StockAssignmentFulfillPanel onFulfilled={() => setProductsRefreshKey((k) => k + 1)} />
                        )}
                        {canAccessStockLocalStockProductsView(user) && (
                            <StockProductsAvailablePanel refreshKey={productsRefreshKey} />
                        )}
                    </>
                )}
                {activeTab === StockTabs.ORDER_HISTORY && showOrderHistory && <StockOrderHistoryPanel />}
            </Box>
        </RoleAccessGuard>
    );
}
