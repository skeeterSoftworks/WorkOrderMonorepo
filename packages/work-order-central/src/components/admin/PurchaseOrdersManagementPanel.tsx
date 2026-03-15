import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PurchaseOrderTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';

type LocalPurchaseOrder = PurchaseOrderTO;

export function PurchaseOrdersManagementPanel() {
    const { t } = useTranslation();

    const [orders, setOrders] = useState<LocalPurchaseOrder[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);
    const [customerName, setCustomerName] = useState('');
    const [reference, setReference] = useState('');
    const [currency, setCurrency] = useState('');
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [comment, setComment] = useState('');
    const [orderToDelete, setOrderToDelete] = useState<LocalPurchaseOrder | null>(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = () => {
        Server.getAllPurchaseOrders(
            (response: any) => {
                let data: LocalPurchaseOrder[] = [];

                if (Array.isArray(response?.data)) {
                    data = response.data;
                } else if (Array.isArray(response?.data?.data)) {
                    data = response.data.data;
                }

                setOrders(data);
            },
            () => {
            }
        );
    };

    const resetForm = () => {
        setSelectedOrderId(undefined);
        setCustomerName('');
        setReference('');
        setCurrency('');
        setDeliveryDate('');
        setComment('');
    };

    const handleEditClick = (order: LocalPurchaseOrder) => {
        setSelectedOrderId(order.id);
        setCustomerName(order.customer?.companyName || '');
        setReference(order.reference || '');
        setCurrency(order.currency || '');
        if (order.deliveryDate) {
            if (Array.isArray(order.deliveryDate)) {
                const [year, month = 1, day = 1] = order.deliveryDate as any[];
                const d = new Date(year, month - 1, day);
                setDeliveryDate(d.toISOString().substring(0, 10));
            } else if (typeof order.deliveryDate === 'string') {
                setDeliveryDate(order.deliveryDate.substring(0, 10));
            }
        } else {
            setDeliveryDate('');
        }
        setComment(order.comment || '');
    };

    const handleSubmit = () => {
        const payload: PurchaseOrderTO = {
            id: selectedOrderId,
            reference,
            currency,
            deliveryDate: deliveryDate || null,
            comment,
            customer: customerName ? { companyName: customerName } : undefined,
        };

        const onSuccess = () => {
            loadOrders();
            resetForm();
        };

        if (selectedOrderId) {
            Server.editPurchaseOrder(payload, onSuccess, () => {});
        } else {
            Server.addPurchaseOrder(payload, onSuccess, () => {});
        }
    };

    const handleDeleteClick = (order: LocalPurchaseOrder) => {
        setOrderToDelete(order);
    };

    const handleConfirmDelete = () => {
        if (!orderToDelete?.id) {
            setOrderToDelete(null);
            return;
        }

        Server.deletePurchaseOrder(
            Number(orderToDelete.id),
            () => {
                loadOrders();
                setOrderToDelete(null);
            },
            () => {
                setOrderToDelete(null);
            }
        );
    };

    const formatDeliveryDate = (value: any): string => {
        if (!value) {
            return '';
        }

        if (Array.isArray(value)) {
            const [year, month = 1, day = 1] = value;
            const d = new Date(year, month - 1, day);
            return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
        }

        if (typeof value === 'string') {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
        }

        return '';
    };

    return (
        <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 320, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('purchaseOrdersManagement')}
                </Typography>

                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label={t('customer')}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('reference')}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('currency')}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('deliveryDate')}
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label={t('comment')}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                    />

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {selectedOrderId ? t('editPurchaseOrder') : t('addPurchaseOrder')}
                        </Button>
                        <Button variant="outlined" onClick={resetForm}>
                            {t('reset')}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ flex: 2, minWidth: 400, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('purchaseOrdersList')}
                </Typography>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('customer')}</TableCell>
                                <TableCell>{t('reference')}</TableCell>
                                <TableCell>{t('currency')}</TableCell>
                                <TableCell>{t('status')}</TableCell>
                                <TableCell>{t('deliveryDate')}</TableCell>
                                <TableCell>{t('comment')}</TableCell>
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id || order.reference}>
                                    <TableCell>{order.customer?.companyName}</TableCell>
                                    <TableCell>{order.reference}</TableCell>
                                    <TableCell>{order.currency}</TableCell>
                                    <TableCell>{order.orderStatus}</TableCell>
                                    <TableCell>{formatDeliveryDate(order.deliveryDate)}</TableCell>
                                    <TableCell>{order.comment}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditClick(order)}
                                            sx={{ mr: 1 }}
                                        >
                                            <LinkIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteClick(order)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ConfirmationModal
                open={!!orderToDelete}
                modalMessage={t('confirmDeletePurchaseOrder')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setOrderToDelete(null)}
            />
        </Box>
    );
}

