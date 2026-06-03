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
import { StockProductsAvailablePanel } from './StockProductsAvailablePanel';
import { StockMaterialsByLocationPanel } from './StockMaterialsByLocationPanel';

const StockTabs = {
    MATERIALS: 0,
    PRODUCTS: 1,
} as const;

type StockTabId = (typeof StockTabs)[keyof typeof StockTabs];

export function StockHome() {
    const { t } = useTranslation();

    const userDataString = sessionStorage.getItem('userData');
    const userData: LoggedUser = userDataString && JSON.parse(userDataString);

    const [activeTab, setActiveTab] = useState<StockTabId>(StockTabs.MATERIALS);

    return (
        <Container>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">
                        {t('stock')} - {t('welcome')}, {userData.name} {userData.surname}
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue as StockTabId)}>
                    <Tab label={t('stockMaterials')} value={StockTabs.MATERIALS} />
                    <Tab label={t('products')} value={StockTabs.PRODUCTS} />
                </Tabs>
            </Box>

            <Box sx={{ py: 4 }}>
                {activeTab === StockTabs.MATERIALS && <StockMaterialsByLocationPanel />}
                {activeTab === StockTabs.PRODUCTS && <StockProductsAvailablePanel />}
            </Box>
        </Container>
    );
}
