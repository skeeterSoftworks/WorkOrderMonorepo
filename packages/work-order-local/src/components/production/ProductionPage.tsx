import {useEffect, useMemo, useState} from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {ProductionWorkOrderTO} from '../../models/ApiRequests.ts';
import {Server} from '../../api/Server.ts';

const SELECT_NONE = '';

function formatDate(value: string | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function workOrderLabel(wo: ProductionWorkOrderTO): string {
    const ref = wo.productReference?.trim();
    const name = wo.productName?.trim();
    const core = [ref, name].filter(Boolean).join(' · ');
    return wo.id != null ? `#${wo.id}${core ? ` — ${core}` : ''}` : core || '—';
}

export function ProductionPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const [workOrders, setWorkOrders] = useState<ProductionWorkOrderTO[]>([]);
    const [selectedId, setSelectedId] = useState<string>(SELECT_NONE);

    useEffect(() => {
        setLoading(true);
        setErrorKey(null);
        setWorkOrders([]);
        setSelectedId(SELECT_NONE);
        Server.getProductionWorkOrdersForBoundMachine(
            (resp: {data?: ProductionWorkOrderTO[]}) => {
                const data = Array.isArray(resp?.data) ? resp.data : [];
                setWorkOrders(data);
                setLoading(false);
            },
            (err: {response?: {data?: string; status?: number}}) => {
                setLoading(false);
                const body = err?.response?.data;
                if (err?.response?.status === 400 && body === 'WORKSTATION_MACHINE_NOT_CONFIGURED') {
                    setErrorKey('workstationNotConfiguredProduction');
                } else {
                    setErrorKey('productionLoadWorkOrdersError');
                }
            }
        );
    }, []);

    const selected = useMemo(() => {
        if (selectedId === SELECT_NONE) return null;
        const id = Number(selectedId);
        return workOrders.find((w) => w.id === id) ?? null;
    }, [selectedId, workOrders]);

    const handleStartWorkSession = () => {
        if (!selected?.id) return;
        sessionStorage.setItem('selectedWorkOrderId', String(selected.id));
        sessionStorage.setItem('selectedWorkOrder', JSON.stringify(selected));
        navigate('/production/work-session');
    };

    return (
        <Container maxWidth="md">
            <AppBar position="static">
                <Toolbar>
                    <IconButton color="inherit" onClick={() => navigate('/')} sx={{mr: 1}} aria-label={t('backToHome')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">{t('production')}</Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{mt: 3}}>
                {loading && (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}>
                        <CircularProgress />
                    </Box>
                )}

                {!loading && errorKey && (
                    <Typography color="error" variant="body2">
                        {t(errorKey)}
                    </Typography>
                )}

                {!loading && !errorKey && workOrders.length === 0 && (
                    <Typography color="text.secondary" variant="body1">
                        {t('productionNoWorkOrders')}
                    </Typography>
                )}

                {!loading && !errorKey && workOrders.length > 0 && (
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label={t('productionSelectWorkOrder')}
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                        >
                            <MenuItem value={SELECT_NONE}>
                                <em>{t('none')}</em>
                            </MenuItem>
                            {workOrders.map((wo) =>
                                wo.id != null ? (
                                    <MenuItem key={wo.id} value={String(wo.id)}>
                                        {workOrderLabel(wo)}
                                    </MenuItem>
                                ) : null
                            )}
                        </TextField>

                        {selected && (
                            <Paper variant="outlined" sx={{p: 2}}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    {t('workOrderDetails')}
                                </Typography>
                                <Divider sx={{my: 1}} />
                                <Typography variant="body2">
                                    <strong>{t('woId')}:</strong> {selected.id ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>{t('woPurchaseOrder')}:</strong> {selected.purchaseOrderId ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>{t('woProductLine')}:</strong>{' '}
                                    {[selected.productReference, selected.productName].filter(Boolean).join(' · ') || '—'}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>{t('woProductOrderId')}:</strong> {selected.productOrderId ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>{t('dueDate')}:</strong> {formatDate(selected.dueDate)}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>{t('startDate')}:</strong> {formatDate(selected.startDate)}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>{t('endDate')}:</strong> {formatDate(selected.endDate)}
                                </Typography>
                                <Typography variant="body2" sx={{mt: 1}}>
                                    <strong>{t('comment')}:</strong> {selected.comment?.trim() ? selected.comment : '—'}
                                </Typography>
                                <Box sx={{mt: 2}}>
                                    <Button variant="contained" color="primary" onClick={handleStartWorkSession}>
                                        {t('startWorkSession')}
                                    </Button>
                                </Box>
                            </Paper>
                        )}
                    </Box>
                )}
            </Box>
        </Container>
    );
}
