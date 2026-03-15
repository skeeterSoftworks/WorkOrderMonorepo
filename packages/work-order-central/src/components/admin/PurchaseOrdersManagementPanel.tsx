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
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PurchaseOrderTO, ProductOrderTO, CustomerTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import {
    downloadPurchaseOrderTemplate,
    parsePurchaseOrderFile,
    type ParsedPurchaseOrder,
} from '../../util/purchaseOrderExcel';

type LocalPurchaseOrder = PurchaseOrderTO;

type ProductOrderRow = { id?: number; productId?: number; quantity: string; pricePerUnit: string };

export function PurchaseOrdersManagementPanel() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [orders, setOrders] = useState<LocalPurchaseOrder[]>([]);
    const [customers, setCustomers] = useState<CustomerTO[]>([]);
    const [products, setProducts] = useState<ProductTO[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
    const [reference, setReference] = useState('');
    const [currency, setCurrency] = useState('');
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [deliveryTerms, setDeliveryTerms] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [comment, setComment] = useState('');
    const [productOrderRows, setProductOrderRows] = useState<ProductOrderRow[]>([]);
    const [orderToDelete, setOrderToDelete] = useState<LocalPurchaseOrder | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsOrder, setDetailsOrder] = useState<LocalPurchaseOrder | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        loadOrders();
        loadCustomers();
        loadProducts();
    }, []);

    const loadCustomers = () => {
        Server.getAllCustomers(
            (response: any) => {
                let data: CustomerTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setCustomers(data);
            },
            () => {},
        );
    };

    const loadProducts = () => {
        Server.getAllProducts(
            (response: any) => {
                let data: ProductTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setProducts(data);
            },
            () => {},
        );
    };

    const loadOrders = () => {
        Server.getAllPurchaseOrders(
            (response: any) => {
                let data: LocalPurchaseOrder[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setOrders(data);
            },
            () => {},
        );
    };

    const resetForm = () => {
        setSelectedOrderId(undefined);
        setSelectedCustomerId(undefined);
        setReference('');
        setCurrency('');
        setDeliveryDate('');
        setDeliveryTerms('');
        setShippingAddress('');
        setComment('');
        setProductOrderRows([]);
    };

    const addProductOrderRow = () => {
        setProductOrderRows((prev) => [...prev, { quantity: '', pricePerUnit: '' }]);
    };

    const removeProductOrderRow = (index: number) => {
        setProductOrderRows((prev) => prev.filter((_, i) => i !== index));
    };

    const updateProductOrderRow = (index: number, field: keyof ProductOrderRow, value: number | string) => {
        setProductOrderRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
        );
    };

    const openFormModal = () => {
        resetForm();
        setFormModalOpen(true);
    };

    const handleEditClick = (order: LocalPurchaseOrder) => {
        setSelectedOrderId(order.id);
        setSelectedCustomerId(order.customer?.id);
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
        setDeliveryTerms(order.deliveryTerms || '');
        setShippingAddress(order.shippingAddress || '');
        setComment(order.comment || '');
        setProductOrderRows(
            (order.productOrderList || []).map((po) => ({
                id: po.id,
                productId: po.product?.id,
                quantity: String(po.quantity ?? ''),
                pricePerUnit: String(po.pricePerUnit ?? ''),
            })),
        );
        setFormModalOpen(true);
    };

    const handleSubmit = () => {
        const productOrderList: ProductOrderTO[] = productOrderRows
            .filter((row) => row.productId != null && row.productId > 0)
            .map((row) => ({
                id: row.id,
                product: { id: row.productId },
                quantity: Number(row.quantity) || 0,
                pricePerUnit: Number(row.pricePerUnit) || 0,
            }));
        const customerId = selectedCustomerId != null && selectedCustomerId !== '' ? Number(selectedCustomerId) : undefined;
        const payload: PurchaseOrderTO = {
            id: selectedOrderId,
            reference,
            currency,
            deliveryDate: deliveryDate || undefined,
            deliveryTerms: deliveryTerms || undefined,
            shippingAddress: shippingAddress || undefined,
            comment,
            customerId,
            customer: customerId != null ? { id: customerId } : undefined,
            productOrderList,
        };

        const onSuccess = () => {
            loadOrders();
            resetForm();
            setFormModalOpen(false);
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
        setDeleteError(null);
        Server.deletePurchaseOrder(
            Number(orderToDelete.id),
            () => {
                loadOrders();
                setOrderToDelete(null);
            },
            (err: any) => {
                const body = err?.response?.data;
                const msg = body === 'PURCHASE_ORDER_HAS_WORK_ORDER'
                    ? t('purchaseOrderHasWorkOrderCannotDelete')
                    : (typeof body === 'string' ? body : t('msg_errorDeletingPurchaseOrder'));
                setDeleteError(msg);
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

    const formatDateTime = (isoString: string | undefined): string => {
        if (!isoString || !isoString.trim()) return '';
        const d = new Date(isoString);
        return Number.isNaN(d.getTime()) ? isoString : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    };

    const handleViewDetails = (order: LocalPurchaseOrder) => {
        if (order.id == null) return;
        setDetailsOrder(null);
        setDetailsModalOpen(true);
        setDetailsLoading(true);
        Server.getPurchaseOrderById(
            Number(order.id),
            (response: any) => {
                const data = response?.data != null ? response.data : response;
                setDetailsOrder(data);
                setDetailsLoading(false);
            },
            () => {
                setDetailsLoading(false);
                setDetailsModalOpen(false);
            },
        );
    };

    const closeDetailsModal = () => {
        setDetailsModalOpen(false);
        setDetailsOrder(null);
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        resetForm();
        setImportError(null);
    };

    const handleDownloadTemplate = () => {
        downloadPurchaseOrderTemplate();
    };

    const resolveCustomerId = (companyName: string): number | undefined => {
        const normalized = companyName.trim().toLowerCase();
        if (!normalized) return undefined;
        const found = customers.find(
            (c) => c.companyName && c.companyName.trim().toLowerCase() === normalized,
        );
        return found?.id;
    };

    const resolveProductId = (nameOrId: string): number | undefined => {
        const trimmed = nameOrId.trim();
        if (!trimmed) return undefined;
        const asNum = Number(trimmed);
        if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
            const byId = products.find((p) => p.id === asNum);
            if (byId) return byId.id;
        }
        const normalized = trimmed.toLowerCase();
        const byName = products.find(
            (p) => p.name && p.name.trim().toLowerCase() === normalized,
        );
        return byName?.id;
    };

    const applyParsedOrder = (parsed: ParsedPurchaseOrder) => {
        setSelectedOrderId(undefined);
        setSelectedCustomerId(resolveCustomerId(parsed.customerCompanyName));
        setReference(parsed.reference);
        setCurrency(parsed.currency);
        setDeliveryDate(parsed.deliveryDate ? parsed.deliveryDate.substring(0, 10) : '');
        setDeliveryTerms(parsed.deliveryTerms);
        setShippingAddress(parsed.shippingAddress);
        setComment(parsed.comment);
        setProductOrderRows(
            parsed.productRows
                .filter((row) => row.productNameOrId)
                .map((row) => ({
                    productId: resolveProductId(row.productNameOrId),
                    quantity: String(row.quantity),
                    pricePerUnit: String(row.pricePerUnit),
                })),
        );
        setFormModalOpen(true);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImportError(null);
        parsePurchaseOrderFile(file)
            .then(applyParsedOrder)
            .catch((err) => {
                setImportError(err instanceof Error ? err.message : t('importExcelError'));
            })
            .finally(() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
            });
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">
                    {t('purchaseOrdersList')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate}>
                        {t('downloadPurchaseOrderTemplate')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {t('importPurchaseOrderFromExcel')}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                    <Button variant="contained" color="primary" onClick={openFormModal}>
                        {t('createNewPurchaseOrder')}
                    </Button>
                </Box>
            </Box>
            {importError && (
                <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                    {importError}
                </Typography>
            )}

            <Paper sx={{ p: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('customer')}</TableCell>
                                <TableCell>{t('reference')}</TableCell>
                                <TableCell>{t('currency')}</TableCell>
                                <TableCell>{t('status')}</TableCell>
                                <TableCell>{t('deliveryDate')}</TableCell>
                                <TableCell>{t('deliveryTerms')}</TableCell>
                                <TableCell>{t('shippingAddress')}</TableCell>
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
                                    <TableCell>{order.deliveryTerms}</TableCell>
                                    <TableCell>{order.shippingAddress}</TableCell>
                                    <TableCell>{order.comment}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleViewDetails(order)}
                                            sx={{ mr: 1 }}
                                            title={t('viewPurchaseOrderDetails')}
                                        >
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditClick(order)}
                                            sx={{ mr: 1 }}
                                            title={t('editPurchaseOrder')}
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

            <Dialog open={formModalOpen} onClose={closeFormModal} maxWidth="md" fullWidth scroll="paper">
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {selectedOrderId ? t('editPurchaseOrder') : t('createNewPurchaseOrder')}
                    <IconButton size="small" onClick={closeFormModal} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            select
                            label={t('customer')}
                            value={selectedCustomerId ?? ''}
                            onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {customers.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.companyName}
                                </MenuItem>
                            ))}
                        </TextField>
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
                            label={t('deliveryTerms')}
                            value={deliveryTerms}
                            onChange={(e) => setDeliveryTerms(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('shippingAddress')}
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
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

                        <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('productOrders')}</Typography>
                        {productOrderRows.map((row, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <TextField
                                    select
                                    label={t('product')}
                                    value={row.productId ?? ''}
                                    onChange={(e) => updateProductOrderRow(index, 'productId', e.target.value ? Number(e.target.value) : undefined)}
                                    size="small"
                                    sx={{ minWidth: 160, flex: 1 }}
                                >
                                    <MenuItem value="">{t('none')}</MenuItem>
                                    {products.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    type="number"
                                    label={t('quantity')}
                                    value={row.quantity}
                                    onChange={(e) => updateProductOrderRow(index, 'quantity', e.target.value)}
                                    size="small"
                                    sx={{ width: 100 }}
                                />
                                <TextField
                                    type="number"
                                    label={t('pricePerUnit')}
                                    value={row.pricePerUnit}
                                    onChange={(e) => updateProductOrderRow(index, 'pricePerUnit', e.target.value)}
                                    size="small"
                                    sx={{ width: 120 }}
                                />
                                <IconButton size="small" onClick={() => removeProductOrderRow(index)} aria-label={t('remove')}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                        <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={addProductOrderRow}>
                            {t('addProductOrder')}
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button variant="contained" color="primary" onClick={handleSubmit}>
                                {selectedOrderId ? t('editPurchaseOrder') : t('addPurchaseOrder')}
                            </Button>
                            <Button variant="outlined" onClick={() => { resetForm(); setFormModalOpen(false); }}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                open={!!orderToDelete}
                modalMessage={t('confirmDeletePurchaseOrder')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => { setOrderToDelete(null); setDeleteError(null); }}
            />
            {deleteError && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {deleteError}
                </Typography>
            )}

            <Dialog
                open={detailsModalOpen}
                onClose={closeDetailsModal}
                maxWidth="lg"
                fullWidth
                scroll="paper"
                PaperProps={{ sx: { minHeight: '75vh', maxHeight: '90vh', minWidth: 720 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {t('purchaseOrderDetails')}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {detailsOrder?.id != null && (
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    navigate(`/work-orders?createFromPurchaseOrder=${detailsOrder.id}`);
                                    closeDetailsModal();
                                }}
                            >
                                {t('createWorkOrderFromThis')}
                            </Button>
                        )}
                        <IconButton size="small" onClick={closeDetailsModal} aria-label={t('close')}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ minHeight: '60vh' }}>
                    {detailsLoading && (
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                            {t('fetchingData')}
                        </Typography>
                    )}
                    {!detailsLoading && detailsOrder && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Typography variant="body2"><strong>{t('reference')}:</strong> {detailsOrder.reference ?? '—'}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{t('customer')}:</strong> {detailsOrder.customer?.companyName ?? '—'}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{t('currency')}:</strong> {detailsOrder.currency ?? '—'}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Typography variant="body2"><strong>{t('deliveryDate')}:</strong> {formatDeliveryDate(detailsOrder.deliveryDate)}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{t('deliveryTerms')}:</strong> {detailsOrder.deliveryTerms || '—'}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Typography variant="body2"><strong>{t('shippingAddress')}:</strong> {detailsOrder.shippingAddress || '—'}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{t('comment')}:</strong> {detailsOrder.comment || '—'}</Typography>
                                </Box>
                            </Box>
                            <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('productOrders')}</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('product')}</TableCell>
                                        <TableCell align="right">{t('quantity')}</TableCell>
                                        <TableCell align="right">{t('pricePerUnit')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(detailsOrder.productOrderList || []).map((po, idx) => (
                                        <TableRow key={po.id ?? idx}>
                                            <TableCell>{po.product?.name ?? '—'}</TableCell>
                                            <TableCell align="right">{po.quantity ?? 0}</TableCell>
                                            <TableCell align="right">{po.pricePerUnit ?? 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Typography variant="subtitle2" sx={{ mt: 3 }}>{t('stateHistory')}</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'stretch' }}>
                                {[
                                    { key: 'CREATED', label: t('stateCreated'), time: detailsOrder.createdAt },
                                    { key: 'CONFIRMED', label: t('stateConfirmed'), time: detailsOrder.confirmedAt },
                                    { key: 'IN_PRODUCTION', label: t('stateInProduction'), time: detailsOrder.inProductionAt, emptyLabel: t('notYet') },
                                    { key: 'COMPLETED', label: t('stateCompleted'), time: detailsOrder.completedAt },
                                    { key: 'DELIVERED', label: t('stateDelivered'), time: detailsOrder.deliveredAt },
                                ].map((item, index) => {
                                    const isCurrent = (detailsOrder.orderStatus ?? 'CREATED') === item.key;
                                    return (
                                        <Box
                                            key={item.key}
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                minWidth: 120,
                                                flex: 1,
                                                py: 1.5,
                                                px: 1.5,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: isCurrent ? 'primary.main' : 'divider',
                                                ...(isCurrent && { bgcolor: 'action.selected' }),
                                            }}
                                        >
                                            <Typography variant="body2" fontWeight={isCurrent ? 600 : 500}>
                                                {item.label}
                                                {isCurrent && (
                                                    <Typography component="span" variant="caption" color="primary" sx={{ ml: 0.5, fontWeight: 600 }}>
                                                        ({t('currentState')})
                                                    </Typography>
                                                )}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {item.time ? formatDateTime(item.time) : (item.emptyLabel ?? '—')}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}

