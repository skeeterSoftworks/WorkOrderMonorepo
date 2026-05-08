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
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LoggedUser } from 'work-order-local/src/models/Common.ts';
import { PurchaseOrdersManagementPanel } from '../admin/PurchaseOrdersManagementPanel';
import { WorkOrdersManagementPanel } from '../admin/WorkOrdersManagementPanel';
import { ProductionPanel } from '../production/ProductionPanel';
import { PurchasingPage } from '../purchasing/PurchasingPage';
import { WorkOrdersHealthPanel } from './WorkOrdersHealthPanel';

const WorkOrdersSections = {
    OVERVIEW: 'overview',
    PURCHASE_ORDERS: 'purchase-orders',
    WORK_ORDERS: 'work-orders',
    PRODUCTION: 'production',
    PURCHASING: 'purchasing',
} as const;

type WorkOrdersSectionId = (typeof WorkOrdersSections)[keyof typeof WorkOrdersSections];

export function WorkOrdersHome() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const userDataString = sessionStorage.getItem('userData');
    const userData: LoggedUser = userDataString && JSON.parse(userDataString);

    const [activeSection, setActiveSection] = useState<WorkOrdersSectionId>(
        WorkOrdersSections.OVERVIEW,
    );

    useEffect(() => {
        const createFromPo = searchParams.get('createFromPurchaseOrder');
        if (createFromPo != null && createFromPo.trim() !== '') {
            setActiveSection(WorkOrdersSections.WORK_ORDERS);
        }
    }, [searchParams]);

    return (
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
                        {t('workOrders')} - {t('welcome')}, {userData.name} {userData.surname}
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 2, mt: 2 }}>
                <Paper variant="outlined" sx={{ p: 1 }}>
                    <List dense>
                        <ListItemText primary={t('operationsSection')} sx={{ px: 1, py: 0.5 }} />
                        <ListItemButton
                            selected={activeSection === WorkOrdersSections.OVERVIEW}
                            onClick={() => setActiveSection(WorkOrdersSections.OVERVIEW)}
                        >
                            <ListItemText primary={t('operationsOverview')} />
                        </ListItemButton>
                        <ListItemButton
                            selected={activeSection === WorkOrdersSections.PURCHASE_ORDERS}
                            onClick={() => setActiveSection(WorkOrdersSections.PURCHASE_ORDERS)}
                        >
                            <ListItemText primary={t('purchaseOrders')} />
                        </ListItemButton>
                        <ListItemButton
                            selected={activeSection === WorkOrdersSections.WORK_ORDERS}
                            onClick={() => setActiveSection(WorkOrdersSections.WORK_ORDERS)}
                        >
                            <ListItemText primary={t('workOrders')} />
                        </ListItemButton>
                        <Divider sx={{ my: 1 }} />
                        <ListItemButton
                            selected={activeSection === WorkOrdersSections.PRODUCTION}
                            onClick={() => setActiveSection(WorkOrdersSections.PRODUCTION)}
                        >
                            <ListItemText primary={t('production')} />
                        </ListItemButton>
                        <ListItemButton
                            selected={activeSection === WorkOrdersSections.PURCHASING}
                            onClick={() => setActiveSection(WorkOrdersSections.PURCHASING)}
                        >
                            <ListItemText primary={t('purchasing')} />
                        </ListItemButton>
                    </List>
                </Paper>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {activeSection === WorkOrdersSections.OVERVIEW && (
                        <>
                            <WorkOrdersHealthPanel />
                            <Typography variant="body2" color="text.secondary">
                                {t('operationsOverviewHint')}
                            </Typography>
                        </>
                    )}
                    {activeSection === WorkOrdersSections.PURCHASE_ORDERS && (
                        <PurchaseOrdersManagementPanel />
                    )}
                    {activeSection === WorkOrdersSections.WORK_ORDERS && <WorkOrdersManagementPanel />}
                    {activeSection === WorkOrdersSections.PRODUCTION && <ProductionPanel />}
                    {activeSection === WorkOrdersSections.PURCHASING && <PurchasingPage />}
                </Box>
            </Box>
        </Container>
    );
}
