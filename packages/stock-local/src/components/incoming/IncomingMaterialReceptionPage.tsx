import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderLineTO, MaterialOrderReceptionTO, MaterialOrderTO, StockLocationTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import { MaterialInternalControlDialog } from './MaterialInternalControlDialog';
import { ReceiveMaterialDialog } from './ReceiveMaterialDialog';
import {
    buildInternalControlPayload,
    orderToReceptionContext,
    type InternalControlSubmitData,
} from './materialValidationUtils';
import {
    stockLocationsForSelect,
} from './materialReceptionStockAllocation';

function parseOrdersResponse(response: unknown): MaterialOrderTO[] {
    const r = response as { data?: MaterialOrderTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

function parseReceptionsResponse(response: unknown): MaterialOrderReceptionTO[] {
    const r = response as { data?: MaterialOrderReceptionTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

function parseStockLocationsResponse(response: unknown): StockLocationTO[] {
    const r = response as { data?: StockLocationTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

function materialOrderHasCertificate(order: MaterialOrderTO): boolean {
    return order.certificatePresent === true;
}

function receptionHasCertificate(reception: MaterialOrderReceptionTO): boolean {
    return reception.certificatePresent === true;
}

type OpenReceptionRow = {
    order: MaterialOrderTO;
    line: MaterialOrderLineTO;
};

function openReceptionRows(orders: MaterialOrderTO[]): OpenReceptionRow[] {
    const rows: OpenReceptionRow[] = [];
    for (const order of orders) {
        const pendingLines = (order.lines ?? []).filter((line) => line.received !== true);
        if (pendingLines.length > 0) {
            for (const line of pendingLines) {
                rows.push({ order, line });
            }
            continue;
        }
        if (!order.lines?.length) {
            rows.push({
                order,
                line: {
                    id: undefined,
                    materialId: order.materialId,
                    materialName: order.materialName,
                    materialCode: order.materialCode,
                    quantity: order.quantity,
                    materialDiameter: order.materialDiameter,
                    materialWeight: order.materialWeight,
                    materialLength: order.materialLength,
                    materialWidth: order.materialWidth,
                },
            });
        }
    }
    return rows;
}

function lineMaterialLabel(line: MaterialOrderLineTO, order: MaterialOrderTO): string {
    return line.materialName?.trim() || line.materialCode?.trim() || order.materialName || order.materialCode || '—';
}

export function IncomingMaterialReceptionPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<MaterialOrderTO[]>([]);
    const [pendingValidations, setPendingValidations] = useState<MaterialOrderReceptionTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [receiveTarget, setReceiveTarget] = useState<OpenReceptionRow | null>(null);
    const [validationReception, setValidationReception] = useState<MaterialOrderReceptionTO | null>(null);
    const [submittingValidation, setSubmittingValidation] = useState(false);
    const [stockLocations, setStockLocations] = useState<StockLocationTO[]>([]);

    const loadData = useCallback((options?: { refresh?: boolean }) => {
        if (options?.refresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setLoadError(false);
        let openDone = false;
        let pendingDone = false;
        let openOrders: MaterialOrderTO[] = [];
        let pending: MaterialOrderReceptionTO[] = [];
        let failed = false;

        const finish = () => {
            if (!openDone || !pendingDone) return;
            if (failed) {
                setLoadError(true);
            } else {
                setOrders(openOrders);
                setPendingValidations(pending);
            }
            setLoading(false);
            setRefreshing(false);
        };

        Server.getMaterialOrdersOpenForReception(
            (response: unknown) => {
                openOrders = parseOrdersResponse(response);
                openDone = true;
                finish();
            },
            () => {
                failed = true;
                openDone = true;
                finish();
            },
        );

        Server.getMaterialOrderReceptionsPendingValidation(
            (response: unknown) => {
                pending = parseReceptionsResponse(response);
                pendingDone = true;
                finish();
            },
            () => {
                failed = true;
                pendingDone = true;
                finish();
            },
        );
    }, []);

    useEffect(() => {
        loadData();
        Server.getAllStockLocations(
            (response: unknown) => setStockLocations(stockLocationsForSelect(parseStockLocationsResponse(response))),
            () => setStockLocations([]),
        );
    }, [loadData]);

    const awaitingReceptionRows = useMemo(() => openReceptionRows(orders), [orders]);

    const openReceiveDialog = (order: MaterialOrderTO, line: MaterialOrderLineTO) => {
        setReceiveTarget({ order, line });
    };

    const closeReceiveDialog = () => setReceiveTarget(null);

    const handleReceived = (saved: MaterialOrderReceptionTO, order: MaterialOrderTO, line: MaterialOrderLineTO) => {
        loadData();
        if (saved.id != null && materialOrderHasCertificate(order)) {
            openValidationDialog({
                ...orderToReceptionContext(order, line, saved.id),
                ...saved,
                materialDiameter: saved.materialDiameter ?? line.materialDiameter,
                materialWeight: saved.materialWeight ?? line.materialWeight,
                materialLength: saved.materialLength ?? line.materialLength,
                materialWidth: saved.materialWidth ?? line.materialWidth,
            });
        }
    };

    const openValidationDialog = (reception: MaterialOrderReceptionTO) => {
        setValidationReception(reception);
    };

    const closeValidationDialog = () => {
        setValidationReception(null);
    };

    const submitInternalControl = (form: InternalControlSubmitData) => {
        if (!validationReception?.id) return;
        setSubmittingValidation(true);
        Server.submitMaterialOrderInternalControl(
            validationReception.id,
            buildInternalControlPayload(validationReception, form),
            () => {
                setSubmittingValidation(false);
                closeValidationDialog();
                loadData();
            },
            () => setSubmittingValidation(false),
        );
    };

    const handleRefresh = () => loadData({ refresh: true });

    return (
        <Box sx={{ py: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom>
                {t('incomingMaterialReception')}
            </Typography>
            <Button component={RouterLink} to="/" sx={{ mb: 2 }}>
                {t('backToHome')}
            </Button>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}
            {!loading && loadError && (
                <Typography color="error">{t('incomingMaterialLoadError')}</Typography>
            )}
            {!loading && !loadError && (
                <>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        {t('incomingMaterialAwaitingReception')}
                    </Typography>
                    <Paper sx={{ p: 1, mb: 3 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('materialOrderCode')}</TableCell>
                                        <TableCell>{t('materialName')}</TableCell>
                                        <TableCell>{t('materialProviderName')}</TableCell>
                                        <TableCell>{t('quantity')}</TableCell>
                                        <TableCell>{t('status')}</TableCell>
                                        <TableCell align="right">{t('actions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {awaitingReceptionRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                {t('incomingMaterialNoOrders')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        awaitingReceptionRows.map(({ order, line }) => (
                                            <TableRow key={`${order.id}-${line.id ?? line.materialId}`}>
                                                <TableCell>{order.code || '—'}</TableCell>
                                                <TableCell>{lineMaterialLabel(line, order)}</TableCell>
                                                <TableCell>{order.materialProviderName || '—'}</TableCell>
                                                <TableCell>{line.quantity ?? 0}</TableCell>
                                                <TableCell>
                                                    {order.status ? t(`materialOrderStatus_${order.status}`) : '—'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => openReceiveDialog(order, line)}
                                                    >
                                                        {t('receiveMaterial')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Typography variant="h6" sx={{ mb: 1 }}>
                        {t('incomingMaterialAwaitingValidation')}
                    </Typography>
                    <Paper sx={{ p: 1 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('materialOrderCode')}</TableCell>
                                        <TableCell>{t('materialName')}</TableCell>
                                        <TableCell>{t('materialProviderName')}</TableCell>
                                        <TableCell>{t('receivedQuantity')}</TableCell>
                                        <TableCell>{t('status')}</TableCell>
                                        <TableCell align="right">{t('actions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingValidations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                {t('incomingMaterialNoPendingValidation')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingValidations.map((r) => (
                                            <TableRow key={r.id ?? r.materialOrderId}>
                                                <TableCell>{r.materialOrderCode || '—'}</TableCell>
                                                <TableCell>{r.materialName || r.materialCode || '—'}</TableCell>
                                                <TableCell>{r.materialProviderName || '—'}</TableCell>
                                                <TableCell>{r.receivedQuantity ?? '—'}</TableCell>
                                                <TableCell>{t('materialOrderStatus_RECEIVED_IN_STOCK')}</TableCell>
                                                <TableCell align="right">
                                                    {receptionHasCertificate(r) ? (
                                                        <IconButton
                                                            size="small"
                                                            title={t('openMaterialValidation')}
                                                            onClick={() => openValidationDialog(r)}
                                                        >
                                                            <FactCheckOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    ) : (
                                                        <Tooltip title={t('materialOrderCertificateRequiredForInternalControl')}>
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled
                                                                    aria-label={t('materialOrderCertificateRequiredForInternalControl')}
                                                                >
                                                                    <FactCheckOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
            {!loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        startIcon={
                            refreshing ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <RefreshIcon />
                            )
                        }
                    >
                        {t('synchronizeTable')}
                    </Button>
                </Box>
            )}

            <ReceiveMaterialDialog
                open={receiveTarget != null}
                order={receiveTarget?.order ?? null}
                line={receiveTarget?.line ?? null}
                stockLocations={stockLocations}
                onClose={closeReceiveDialog}
                onReceived={handleReceived}
            />

            <MaterialInternalControlDialog
                open={validationReception != null}
                reception={validationReception}
                submitting={submittingValidation}
                onClose={closeValidationDialog}
                onSubmit={submitInternalControl}
                onMeasureLater={closeValidationDialog}
            />
        </Box>
    );
}
