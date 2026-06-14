import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StockMaterialsByLocationPanel } from './StockMaterialsByLocationPanel';
import { StockProductsAvailablePanel } from './StockProductsAvailablePanel';

const StockTabs = {
    MATERIALS: 0,
    PRODUCTS: 1,
} as const;

type StockTabId = (typeof StockTabs)[keyof typeof StockTabs];

export function StockPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<StockTabId>(StockTabs.MATERIALS);

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
                </Tabs>
            </Box>

            {activeTab === StockTabs.MATERIALS && <StockMaterialsByLocationPanel />}
            {activeTab === StockTabs.PRODUCTS && <StockProductsAvailablePanel />}
        </Box>
    );
}
