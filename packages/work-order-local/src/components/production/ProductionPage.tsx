import {useCallback, useEffect, useMemo, useState} from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {ProductionWorkOrderTO, WorkstationMachineConfigTO} from '../../models/ApiRequests.ts';
import type {TFunction} from 'i18next';
import {Server} from '../../api/Server.ts';
import {formatEuropeanDate} from 'sf-common/src/util/DateUtils';
import {normalizeBinaryDataUrl} from 'sf-common/src/util/mediaDataUrl';
import {ProductionWorkSessionPanel} from './ProductionWorkSessionPanel.tsx';
import {isWorkOrderClosedForProduction} from './workOrderProductionHelpers.ts';

const SELECT_NONE = '';

function formatDate(value: string | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : formatEuropeanDate(d);
}

function workOrderLabel(wo: ProductionWorkOrderTO, t: TFunction): string {
    const ref = wo.productReference?.trim();
    const name = wo.productName?.trim();
    const core = [ref, name].filter(Boolean).join(' · ');
    const base = wo.id != null ? `#${wo.id}${core ? ` — ${core}` : ''}` : core || '—';
    return isWorkOrderClosedForProduction(wo) ? `${base} (${t('workOrderStateComplete')})` : base;
}

export function ProductionPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [listLoading, setListLoading] = useState(true);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const [workOrders, setWorkOrders] = useState<ProductionWorkOrderTO[]>([]);
    const [selectedId, setSelectedId] = useState<string>(SELECT_NONE);
    const [workOrderSelectorLocked, setWorkOrderSelectorLocked] = useState(false);
    const [hideProductionChrome, setHideProductionChrome] = useState(false);
    const [workstationMachineImageSrc, setWorkstationMachineImageSrc] = useState<string | undefined>(undefined);

    const handleActiveWorkSessionChange = useCallback((active: boolean) => {
        setHideProductionChrome(active);
    }, []);

    useEffect(() => {
        setListLoading(true);
        setErrorKey(null);
        setWorkOrders([]);
        setSelectedId(SELECT_NONE);
        Server.getProductionWorkOrdersForBoundMachine(
            (resp: {data?: ProductionWorkOrderTO[]}) => {
                const data = Array.isArray(resp?.data) ? resp.data : [];
                setWorkOrders(data);
                setListLoading(false);
            },
            (err: {response?: {data?: string; status?: number}}) => {
                setListLoading(false);
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

    useEffect(() => {
        let cancelled = false;
        if (!selected) {
            setWorkstationMachineImageSrc(undefined);
            return;
        }
        (async () => {
            try {
                const cfg = await new Promise<WorkstationMachineConfigTO>((resolve, reject) => {
                    Server.getWorkstationMachine(
                        (response: {data: WorkstationMachineConfigTO}) => resolve(response.data),
                        reject,
                    );
                });
                const mid = cfg?.machineId;
                if (mid == null || !Number.isFinite(Number(mid))) {
                    if (!cancelled) setWorkstationMachineImageSrc(undefined);
                    return;
                }
                const m = await Server.getCentralMachineById(Number(mid));
                if (cancelled) return;
                const raw = m?.machineImageBase64?.trim();
                setWorkstationMachineImageSrc(raw ? normalizeBinaryDataUrl(raw) : undefined);
            } catch {
                if (!cancelled) setWorkstationMachineImageSrc(undefined);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selected]);

    const handleClearWorkOrderSelection = () => {
        setSelectedId(SELECT_NONE);
    };

    useEffect(() => {
        if (selectedId === SELECT_NONE) {
            setWorkOrderSelectorLocked(false);
            setHideProductionChrome(false);
        }
    }, [selectedId]);

    const refreshWorkOrders = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            Server.getProductionWorkOrdersForBoundMachine(
                (resp: {data?: ProductionWorkOrderTO[]}) => {
                    const data = Array.isArray(resp?.data) ? resp.data : [];
                    setWorkOrders(data);
                    resolve();
                },
                () => resolve(),
            );
        });
    }, []);

    return (
        <Container maxWidth="lg">
            {!hideProductionChrome && (
                <AppBar position="static">
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            onClick={() => navigate('/')}
                            sx={{mr: 1}}
                            aria-label={t('backToHome')}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6">{t('production')}</Typography>
                    </Toolbar>
                </AppBar>
            )}

            <Box sx={{mt: hideProductionChrome ? 2 : 3}}>
                {listLoading && <LinearProgress sx={{mb: 2}} />}

                {!listLoading && errorKey && (
                    <Typography color="error" variant="body2">
                        {t(errorKey)}
                    </Typography>
                )}

                {!listLoading && !errorKey && workOrders.length === 0 && (
                    <Typography color="text.secondary" variant="body1">
                        {t('productionNoWorkOrders')}
                    </Typography>
                )}

                {!listLoading && !errorKey && workOrders.length > 0 && (
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                        {!hideProductionChrome && (
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label={t('productionSelectWorkOrder')}
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                disabled={workOrderSelectorLocked}
                                helperText={workOrderSelectorLocked ? t('productionWorkOrderLockedHint') : undefined}
                            >
                                <MenuItem value={SELECT_NONE}>
                                    <em>{t('none')}</em>
                                </MenuItem>
                                {workOrders.map((wo) =>
                                    wo.id != null ? (
                                        <MenuItem
                                            key={wo.id}
                                            value={String(wo.id)}
                                            disabled={isWorkOrderClosedForProduction(wo)}
                                        >
                                            {workOrderLabel(wo, t)}
                                        </MenuItem>
                                    ) : null
                                )}
                            </TextField>
                        )}

                        {selected && (
                            <Paper variant="outlined" sx={{p: 2}}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    {t('workOrderDetails')}
                                </Typography>
                                <Divider sx={{my: 1}} />
                                <Stack
                                    direction={{xs: 'column', sm: 'row'}}
                                    spacing={2}
                                    alignItems={{xs: 'stretch', sm: 'flex-start'}}
                                    sx={{width: '100%'}}
                                >
                                    <Box sx={{flex: '1 1 0', minWidth: 0}}>
                                        <Typography variant="body2">
                                            <strong>{t('woProductLine')}:</strong>{' '}
                                            {[selected.productReference, selected.productName]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
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
                                        <Typography variant="body2" sx={{mt: 1, whiteSpace: 'pre-wrap'}}>
                                            <strong>{t('comment')}:</strong>{' '}
                                            {selected.comment?.trim() ? selected.comment : '—'}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            flex: {sm: '0 0 auto'},
                                            width: {xs: '100%', sm: 160},
                                            maxWidth: {sm: 180},
                                            pl: {sm: 2},
                                            borderLeft: {sm: 1},
                                            borderTop: {xs: 1, sm: 0},
                                            borderColor: 'divider',
                                            pt: {xs: 2, sm: 0},
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" sx={{mb: 0.75, display: 'block'}}>
                                            {t('productionMachineImage')}
                                        </Typography>
                                        {workstationMachineImageSrc ? (
                                            <Box
                                                component="img"
                                                src={workstationMachineImageSrc}
                                                alt=""
                                                sx={{
                                                    width: '100%',
                                                    maxHeight: 160,
                                                    objectFit: 'contain',
                                                    borderRadius: 1,
                                                    bgcolor: 'background.paper',
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {t('none')}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>

                                <ProductionWorkSessionPanel
                                    key={selected.id}
                                    workOrder={selected}
                                    onClearSelection={handleClearWorkOrderSelection}
                                    onWorkOrdersRefresh={refreshWorkOrders}
                                    onWorkOrderSelectorLockedChange={setWorkOrderSelectorLocked}
                                    onActiveWorkSessionChange={handleActiveWorkSessionChange}
                                />
                            </Paper>
                        )}
                    </Box>
                )}
            </Box>
        </Container>
    );
}
