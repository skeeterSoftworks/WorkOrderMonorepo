import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';

function parseOrdersResponse(response: unknown): MaterialOrderTO[] {
    const r = response as { data?: MaterialOrderTO[] };
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

export function IncomingMaterialReceptionPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<MaterialOrderTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<MaterialOrderTO | null>(null);
    const [receivedAt, setReceivedAt] = useState('');
    const [receivedQuantity, setReceivedQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadOrders = useCallback(() => {
        setLoading(true);
        setLoadError(false);
        Server.getMaterialOrdersOpenForReception(
            (response: unknown) => {
                setOrders(parseOrdersResponse(response));
                setLoading(false);
            },
            () => {
                setLoadError(true);
                setLoading(false);
            },
        );
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const openReceiveDialog = (order: MaterialOrderTO) => {
        setSelectedOrder(order);
        setReceivedAt(toDatetimeLocalValue(new Date()));
        setReceivedQuantity(String(order.quantity ?? ''));
    };

    const closeDialog = () => {
        setSelectedOrder(null);
        setReceivedAt('');
        setReceivedQuantity('');
    };

    const confirmReceive = () => {
        if (!selectedOrder?.id) return;
        const qty = Number.parseInt(receivedQuantity, 10);
        if (!Number.isFinite(qty) || qty <= 0) return;

        setSubmitting(true);
        Server.recordMaterialOrderReception(
            {
                materialOrderId: selectedOrder.id,
                receivedAt: toServerDateTime(receivedAt),
                receivedQuantity: qty,
            },
            () => {
                setSubmitting(false);
                closeDialog();
                loadOrders();
            },
            () => setSubmitting(false),
        );
    };

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
                <Paper sx={{ p: 1 }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
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
                                        <TableCell colSpan={5} align="center">
                                            {t('incomingMaterialNoOrders')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((o) => (
                                        <TableRow key={o.id}>
                                            <TableCell>{o.materialName || o.materialCode || '—'}</TableCell>
                                            <TableCell>{o.materialProviderName || '—'}</TableCell>
                                            <TableCell>{o.quantity ?? 0}</TableCell>
                                            <TableCell>
                                                {o.status ? t(`materialOrderStatus_${o.status}`) : '—'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => openReceiveDialog(o)}
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
            )}

            <Dialog open={selectedOrder != null} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{t('receiveMaterialDialogTitle')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} disabled={submitting}>
                        {t('cancel')}
                    </Button>
                    <Button variant="contained" onClick={confirmReceive} disabled={submitting}>
                        {t('confirmAction')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
