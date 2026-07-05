import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const [activeTab, setActiveTab] = useState<StockTabId>(StockTabs.MATERIALS);
    const [productsRefreshKey, setProductsRefreshKey] = useState(0);
    const [materialsRefreshKey, setMaterialsRefreshKey] = useState(0);

    return (
        <Box sx={{ py: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom>
                {t('stock')}
            </Typography>
            <Button component={RouterLink} to="/" sx={{ mb: 2 }}>
                {t('backToHome')}
            </Button>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value as StockTabId)}>
                    <Tab label={t('stockMaterials')} value={StockTabs.MATERIALS} />
                    <Tab label={t('products')} value={StockTabs.PRODUCTS} />
                    <Tab label={t('stockOrderHistoryTab')} value={StockTabs.ORDER_HISTORY} />
                </Tabs>
            </Box>

            {activeTab === StockTabs.MATERIALS && (
                <>
                    <MaterialAssignmentFulfillPanel onFulfilled={() => setMaterialsRefreshKey((k) => k + 1)} />
                    <StockMaterialsByLocationPanel refreshKey={materialsRefreshKey} />
                </>
            )}
            {activeTab === StockTabs.PRODUCTS && (
                <>
                    <StockAssignmentFulfillPanel onFulfilled={() => setProductsRefreshKey((k) => k + 1)} />
                    <StockProductsAvailablePanel refreshKey={productsRefreshKey} />
                </>
            )}
            {activeTab === StockTabs.ORDER_HISTORY && <StockOrderHistoryPanel />}
        </Box>
    );
}
