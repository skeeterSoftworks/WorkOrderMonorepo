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
    Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderLineTO, MaterialOrderReceptionTO, MaterialOrderTO, StockLocationTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import { MaterialInternalControlDialog } from './MaterialInternalControlDialog';
import { MaterialDeliveryNotesPanel } from './MaterialDeliveryNotesPanel';
import { ReceiveMaterialDialog } from './ReceiveMaterialDialog';
import {
    buildInternalControlPayload,
    orderToReceptionContext,
    type InternalControlSubmitData,
} from './materialValidationUtils';
import { stockLocationsForSelect } from './materialReceptionStockAllocation';
import {
    formatQuantityWithUnit,
    lineUnitOfMeasure,
    materialUnitOfMeasureLabel,
    receptionUnitOfMeasure,
} from './materialUnitOfMeasure';

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
                    materialUnitOfMeasure: order.materialUnitOfMeasure,
                },
            });
        }
    }
    return rows;
}

function lineMaterialLabel(line: MaterialOrderLineTO, order: MaterialOrderTO): string {
    return line.materialName?.trim() || line.materialCode?.trim() || order.materialName || order.materialCode || '—';
}

function lineQuantityLabel(line: MaterialOrderLineTO, order: MaterialOrderTO, t: (key: string) => string): string {
    const unit = lineUnitOfMeasure(line, order);
    const ordered = line.quantity ?? 0;
    const received = line.receivedQuantityTotal ?? 0;
    if (received > 0 && received < ordered) {
        return formatQuantityWithUnit(`${received} / ${ordered}`, unit, t);
    }
    return formatQuantityWithUnit(ordered, unit, t);
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
        if (saved.id != null) {
            openValidationDialog({
                ...orderToReceptionContext(order, line, saved.id),
                ...saved,
                materialDiameter: saved.materialDiameter ?? line.materialDiameter,
                materialWeight: saved.materialWeight ?? line.materialWeight,
                materialLength: saved.materialLength ?? line.materialLength,
                materialWidth: saved.materialWidth ?? line.materialWidth,
                materialUnitOfMeasure: saved.materialUnitOfMeasure ?? line.materialUnitOfMeasure ?? order.materialUnitOfMeasure,
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
                                        <TableCell>{t('productMaterialUnitOfMeasure')}</TableCell>
                                        <TableCell>{t('quantity')}</TableCell>
                                        <TableCell>{t('deliveryNotes')}</TableCell>
                                        <TableCell>{t('status')}</TableCell>
                                        <TableCell align="right">{t('actions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {awaitingReceptionRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                {t('incomingMaterialNoOrders')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        awaitingReceptionRows.map(({ order, line }) => (
                                            <TableRow key={`${order.id}-${line.id ?? line.materialId}`}>
                                                <TableCell>{order.code || '—'}</TableCell>
                                                <TableCell>{lineMaterialLabel(line, order)}</TableCell>
                                                <TableCell>{order.materialProviderName || '—'}</TableCell>
                                                <TableCell>{materialUnitOfMeasureLabel(lineUnitOfMeasure(line, order), t)}</TableCell>
                                                <TableCell>{lineQuantityLabel(line, order, t)}</TableCell>
                                                <TableCell>
                                                    <MaterialDeliveryNotesPanel
                                                        notes={line.deliveryNotes ?? []}
                                                        rowKey={`${order.id}-${line.id ?? line.materialId}`}
                                                        unitLabel={materialUnitOfMeasureLabel(lineUnitOfMeasure(line, order), t)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {order.status ? t(`materialOrderStatus_${order.status}`) : '—'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => openReceiveDialog(order, line)}
                                                        disabled={(line.remainingQuantity ?? Math.max(0, (line.quantity ?? 0) - (line.receivedQuantityTotal ?? 0))) <= 0}
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
                                        <TableCell>{t('productMaterialUnitOfMeasure')}</TableCell>
                                        <TableCell>{t('deliveryNoteNumber')}</TableCell>
                                        <TableCell>{t('receivedQuantity')}</TableCell>
                                        <TableCell>{t('status')}</TableCell>
                                        <TableCell align="right">{t('actions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingValidations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                {t('incomingMaterialNoPendingValidation')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingValidations.map((r) => (
                                            <TableRow key={r.id ?? `${r.deliveryNoteId}-${r.materialOrderLineId}`}>
                                                <TableCell>{r.materialOrderCode || '—'}</TableCell>
                                                <TableCell>{r.materialName || r.materialCode || '—'}</TableCell>
                                                <TableCell>{r.materialProviderName || '—'}</TableCell>
                                                <TableCell>{materialUnitOfMeasureLabel(receptionUnitOfMeasure(r), t)}</TableCell>
                                                <TableCell>{r.deliveryNoteNumber || '—'}</TableCell>
                                                <TableCell>
                                                    {r.receivedQuantity != null
                                                        ? formatQuantityWithUnit(r.receivedQuantity, receptionUnitOfMeasure(r), t)
                                                        : '—'}
                                                </TableCell>
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
