import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderReceptionTO, MaterialOrderTO, StockLocationTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import { MaterialInternalControlDialog } from './MaterialInternalControlDialog';
import { ReceiveMaterialStockAllocationSection } from './ReceiveMaterialStockAllocationSection';
import {
    buildInternalControlPayload,
    orderToReceptionContext,
    type InternalControlSubmitData,
} from './materialValidationUtils';
import {
    buildStockAllocationsPayload,
    isReceiveFormValid,
    newAllocationRow,
    parseReceivedQuantity,
    type StockAllocationRow,
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

function toDatetimeLocalValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toServerDateTime(localValue: string): string {
    if (!localValue) return '';
    return localValue.length === 16 ? `${localValue}:00` : localValue;
}

function materialOrderHasCertificate(order: MaterialOrderTO): boolean {
    return order.certificatePresent === true;
}

export function IncomingMaterialReceptionPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<MaterialOrderTO[]>([]);
    const [pendingValidations, setPendingValidations] = useState<MaterialOrderReceptionTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<MaterialOrderTO | null>(null);
    const [receivedAt, setReceivedAt] = useState('');
    const [receivedQuantity, setReceivedQuantity] = useState('');
    const [submittingReceive, setSubmittingReceive] = useState(false);
    const [validationReception, setValidationReception] = useState<MaterialOrderReceptionTO | null>(null);
    const [submittingValidation, setSubmittingValidation] = useState(false);
    const [stockLocations, setStockLocations] = useState<StockLocationTO[]>([]);
    const [allocationRows, setAllocationRows] = useState<StockAllocationRow[]>([newAllocationRow()]);

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

    const receivedQtyParsed = parseReceivedQuantity(receivedQuantity);
    const canConfirmReceive =
        selectedOrder != null &&
        isReceiveFormValid({
            receivedQuantity,
            orderQuantity: selectedOrder.quantity,
            allocationRows,
        });

    const openReceiveDialog = (order: MaterialOrderTO) => {
        if (!materialOrderHasCertificate(order)) return;
        setSelectedOrder(order);
        setReceivedAt(toDatetimeLocalValue(new Date()));
        setReceivedQuantity(String(order.quantity ?? ''));
        setAllocationRows([newAllocationRow()]);
    };

    const closeReceiveDialog = () => {
        setSelectedOrder(null);
        setReceivedAt('');
        setReceivedQuantity('');
        setAllocationRows([newAllocationRow()]);
    };

    const openValidationDialog = (reception: MaterialOrderReceptionTO) => {
        setValidationReception(reception);
    };

    const closeValidationDialog = () => {
        setValidationReception(null);
    };

    const confirmReceive = () => {
        if (!selectedOrder?.id || !canConfirmReceive) return;
        const qty = receivedQtyParsed;
        if (qty == null) return;

        setSubmittingReceive(true);
        Server.recordMaterialOrderReception(
            {
                materialOrderId: selectedOrder.id,
                receivedAt: toServerDateTime(receivedAt),
                receivedQuantity: qty,
                stockAllocations: buildStockAllocationsPayload(allocationRows),
            },
            (response: unknown) => {
                setSubmittingReceive(false);
                const saved = (response as { data?: MaterialOrderReceptionTO })?.data;
                closeReceiveDialog();
                loadData();
                if (saved?.id != null) {
                    openValidationDialog({
                        ...orderToReceptionContext(selectedOrder, saved.id),
                        ...saved,
                        materialDiameter: saved.materialDiameter ?? selectedOrder.materialDiameter,
                        materialWeight: saved.materialWeight ?? selectedOrder.materialWeight,
                        materialLength: saved.materialLength ?? selectedOrder.materialLength,
                        materialWidth: saved.materialWidth ?? selectedOrder.materialWidth,
                    });
                }
            },
            () => setSubmittingReceive(false),
        );
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
                                    {orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                {t('incomingMaterialNoOrders')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map((o) => (
                                            <TableRow key={o.id}>
                                                <TableCell>{o.code || '—'}</TableCell>
                                                <TableCell>{o.materialName || o.materialCode || '—'}</TableCell>
                                                <TableCell>{o.materialProviderName || '—'}</TableCell>
                                                <TableCell>{o.quantity ?? 0}</TableCell>
                                                <TableCell>
                                                    {o.status ? t(`materialOrderStatus_${o.status}`) : '—'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {materialOrderHasCertificate(o) ? (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            onClick={() => openReceiveDialog(o)}
                                                        >
                                                            {t('receiveMaterial')}
                                                        </Button>
                                                    ) : (
                                                        <Tooltip title={t('materialOrderCertificateMissing')}>
                                                            <IconButton
                                                                size="small"
                                                                aria-label={t('materialOrderCertificateMissing')}
                                                                sx={{ color: 'warning.main' }}
                                                            >
                                                                <ErrorOutlineIcon fontSize="small" />
                                                            </IconButton>
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
                                                    <IconButton
                                                        size="small"
                                                        title={t('openMaterialValidation')}
                                                        onClick={() => openValidationDialog(r)}
                                                    >
                                                        <FactCheckOutlinedIcon fontSize="small" />
                                                    </IconButton>
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

            <Dialog open={selectedOrder != null} onClose={closeReceiveDialog} maxWidth="md" fullWidth>
                <DialogTitle>{t('receiveMaterialDialogTitle')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {selectedOrder?.code ? `${selectedOrder.code} — ` : ''}
                        {selectedOrder?.materialName || selectedOrder?.materialCode} —{' '}
                        {selectedOrder?.materialProviderName}
                    </Typography>
                    <TextField
                        label={t('receptionDate')}
                        type="datetime-local"
                        value={receivedAt}
                        onChange={(e) => setReceivedAt(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                    <TextField
                        label={t('receivedQuantity')}
                        type="number"
                        value={receivedQuantity}
                        onChange={(e) => setReceivedQuantity(e.target.value)}
                        fullWidth
                        inputProps={{ min: 1 }}
                        helperText={t('receivedQuantityMustMatchOrder')}
                    />
                    <ReceiveMaterialStockAllocationSection
                        rows={allocationRows}
                        stockLocations={stockLocations}
                        receivedQuantity={receivedQtyParsed}
                        onRowsChange={setAllocationRows}
                        onAddRow={() => setAllocationRows((prev) => [...prev, newAllocationRow()])}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeReceiveDialog} disabled={submittingReceive}>
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={confirmReceive}
                        disabled={submittingReceive || !canConfirmReceive}
                    >
                        {t('confirmAction')}
                    </Button>
                </DialogActions>
            </Dialog>

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
