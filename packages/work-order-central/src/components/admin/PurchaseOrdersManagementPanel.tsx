import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
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
import BlockIcon from '@mui/icons-material/Block';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { PurchaseOrderTO, CustomerTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { formatEuropeanDate, formatEuropeanDateTime } from 'sf-common/src/util/DateUtils';
import { Server, ConfirmationModal } from 'sf-common';
import { toastActionError, toastActionSuccess } from '../../util/actionToast';
import {
    downloadPurchaseOrderTemplate,
    parsePurchaseOrderFile,
    type ParsedPurchaseOrder,
} from '../../util/purchaseOrderExcel';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx,
} from '../shared/tableActions';
import {
    PurchaseOrderFormDialog,
    type PurchaseOrderFormImportDraft,
} from './PurchaseOrderFormDialog';
import {
    PurchaseOrderSearchFilters,
    type PurchaseOrderSearchFiltersForm,
} from './PurchaseOrderSearchFilters';

type LocalPurchaseOrder = PurchaseOrderTO;

const PURCHASE_ORDER_STATUSES = [
    'CREATED',
    'CONFIRMED',
    'IN_PRODUCTION',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED',
    'REJECTED',
] as const;

function formatPricePerUnit(value: number | null | undefined): string {
    if (value == null) {
        return '—';
    }
    if (!Number.isFinite(value)) {
        return '—';
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function toIsoDateInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentMonthDateRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toIsoDateInput(from), to: toIsoDateInput(to) };
}

function parsePurchaseOrderCreatedAt(iso?: string): Date | null {
    if (!iso) {
        return null;
    }
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isCreatedWithinPeriod(created: Date | null, from: string, to: string): boolean {
    if (!created) {
        return false;
    }
    if (from) {
        const start = new Date(`${from}T00:00:00`);
        if (created < start) {
            return false;
        }
    }
    if (to) {
        const end = new Date(`${to}T23:59:59.999`);
        if (created > end) {
            return false;
        }
    }
    return true;
}

function canRejectPurchaseOrder(order: LocalPurchaseOrder): boolean {
    if (order.hasWorkOrder) {
        return false;
    }
    const status = order.orderStatus ?? 'CREATED';
    return status === 'CREATED' || status === 'CONFIRMED';
}

function purchaseOrderLockedByWorkOrder(order: LocalPurchaseOrder): boolean {
    return order.hasWorkOrder === true;
}

function purchaseOrderStatusLabel(status: string | undefined, translate: TFunction): string {
    const s = status ?? 'CREATED';
    switch (s) {
        case 'CREATED':
            return translate('stateCreated');
        case 'CONFIRMED':
            return translate('stateConfirmed');
        case 'IN_PRODUCTION':
            return translate('stateInProduction');
        case 'COMPLETED':
            return translate('stateCompleted');
        case 'DELIVERED':
            return translate('stateDelivered');
        case 'CANCELLED':
            return translate('stateCancelled');
        case 'REJECTED':
            return translate('stateRejected');
        default:
            return status ?? '—';
    }
}

export function PurchaseOrdersManagementPanel() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [orders, setOrders] = useState<LocalPurchaseOrder[]>([]);
    const [customers, setCustomers] = useState<CustomerTO[]>([]);
    const [products, setProducts] = useState<ProductTO[]>([]);
    const [editingOrder, setEditingOrder] = useState<LocalPurchaseOrder | null>(null);
    const [importDraft, setImportDraft] = useState<PurchaseOrderFormImportDraft | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<LocalPurchaseOrder | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsOrder, setDetailsOrder] = useState<LocalPurchaseOrder | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deliveryTermsSelectOptions, setDeliveryTermsSelectOptions] = useState<string[]>([]);
    const defaultMonthRange = useMemo(() => currentMonthDateRange(), []);
    const [appliedFilters, setAppliedFilters] = useState<PurchaseOrderSearchFiltersForm>(() => ({
        status: 'ALL',
        periodFrom: defaultMonthRange.from,
        periodTo: defaultMonthRange.to,
    }));
    const [orderToReject, setOrderToReject] = useState<LocalPurchaseOrder | null>(null);

    useEffect(() => {
        loadOrders();
        loadCustomers();
        loadProducts();
    }, []);

    useEffect(() => {
        Server.getSelectOptions(
            (resp: { data?: { deliveryTerms?: string[]; data?: { deliveryTerms?: string[] } } }) => {
                const topLevel = resp?.data?.deliveryTerms;
                const nested = resp?.data?.data?.deliveryTerms;
                const list = Array.isArray(topLevel) ? topLevel : Array.isArray(nested) ? nested : [];
                setDeliveryTermsSelectOptions(list);
            },
            () => {
                setDeliveryTermsSelectOptions([]);
            },
        );
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const status = order.orderStatus ?? 'CREATED';
            if (appliedFilters.status !== 'ALL' && status !== appliedFilters.status) {
                return false;
            }
            return isCreatedWithinPeriod(
                parsePurchaseOrderCreatedAt(order.createdAt),
                appliedFilters.periodFrom,
                appliedFilters.periodTo,
            );
        });
    }, [orders, appliedFilters]);

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

    const closeFormModal = () => {
        setFormModalOpen(false);
        setEditingOrder(null);
        setImportDraft(null);
        setImportError(null);
    };

    const openFormModal = () => {
        setEditingOrder(null);
        setImportDraft(null);
        setFormModalOpen(true);
    };

    const handleEditClick = (order: LocalPurchaseOrder) => {
        setEditingOrder(order);
        setImportDraft(null);
        setFormModalOpen(true);
    };

    const handleFormSaved = () => {
        loadOrders();
        loadProducts();
    };

    const handleDeleteClick = (order: LocalPurchaseOrder) => {
        setOrderToDelete(order);
    };

    const handleRejectClick = (order: LocalPurchaseOrder) => {
        setOrderToReject(order);
    };

    const handleConfirmReject = () => {
        if (!orderToReject?.id) {
            setOrderToReject(null);
            return;
        }
        Server.rejectPurchaseOrder(
            Number(orderToReject.id),
            () => {
                loadOrders();
                setOrderToReject(null);
                toastActionSuccess(t('toastPurchaseOrderRejected'));
            },
            (err: unknown) => {
                const body = (err as { response?: { data?: unknown } })?.response?.data;
                const msg =
                    body === 'PURCHASE_ORDER_HAS_WORK_ORDER'
                        ? t('purchaseOrderHasWorkOrderCannotReject')
                        : body === 'PURCHASE_ORDER_REJECT_NOT_ALLOWED'
                          ? t('purchaseOrderRejectNotAllowed')
                          : typeof body === 'string'
                            ? body
                            : t('msg_errorRejectingPurchaseOrder');
                setOrderToReject(null);
                toastActionError(msg);
            },
        );
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
                setDeleteError(null);
                toastActionSuccess(t('toastPurchaseOrderDeleted'));
            },
            (err: any) => {
                const body = err?.response?.data;
                const msg =
                    body === 'PURCHASE_ORDER_HAS_WORK_ORDER'
                        ? t('purchaseOrderHasWorkOrderCannotDelete')
                        : typeof body === 'string'
                          ? body
                          : t('msg_errorDeletingPurchaseOrder');
                setOrderToDelete(null);
                toastActionError(msg);
            },
        );
    };

    const catalogueSummary = (order: LocalPurchaseOrder): string => {
        const refs = (order.productOrderList || [])
            .map((po) => po.product?.reference)
            .filter((r): r is string => !!r && r.trim() !== '');
        if (refs.length === 0) return '—';
        return [...new Set(refs)].join(', ');
    };

    const resolveCustomerId = (companyName: string): number | undefined => {
        const normalized = companyName.trim().toLowerCase();
        if (!normalized) return undefined;
        const found = customers.find(
            (c) => c.companyName && c.companyName.trim().toLowerCase() === normalized,
        );
        return found?.id;
    };

    const resolveProductId = (nameOrId: string, customerId: number | undefined): number | undefined => {
        const trimmed = nameOrId.trim();
        if (!trimmed) return undefined;
        const pool =
            customerId == null
                ? []
                : products.filter((p) => (p.customerIds ?? []).includes(customerId));
        const asNum = Number(trimmed);
        if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
            const byId = pool.find((p) => p.id === asNum);
            if (byId) return byId.id;
        }
        const normalized = trimmed.toLowerCase();
        const byName = pool.find((p) => p.name && p.name.trim().toLowerCase() === normalized);
        return byName?.id;
    };

    const applyParsedOrder = (parsed: ParsedPurchaseOrder) => {
        const cid = resolveCustomerId(parsed.customerCompanyName);
        setEditingOrder(null);
        setImportDraft({
            customerId: cid,
            comment: parsed.comment,
            productOrderRows: parsed.productRows
                .filter((row) => row.productNameOrId)
                .map((row) => {
                    const pid = resolveProductId(row.productNameOrId, cid);
                    const p = pid != null ? products.find((pr) => pr.id === pid) : undefined;
                    const cat = row.catalogueId?.trim() || p?.reference || '';
                    return {
                        productId: pid,
                        catalogueReference: cat,
                        quantity: String(row.quantity),
                        pricePerUnit: String(row.pricePerUnit),
                    };
                }),
        });
        setFormModalOpen(true);
    };

    const formatDeliveryDate = (value: any): string => {
        if (!value) {
            return '';
        }

        if (Array.isArray(value)) {
            const [year, month = 1, day = 1] = value;
            const d = new Date(year, month - 1, day);
            return Number.isNaN(d.getTime()) ? '' : formatEuropeanDate(d);
        }

        if (typeof value === 'string') {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? value : formatEuropeanDate(d);
        }

        return '';
    };

    const formatDateTime = (isoString: string | undefined): string => {
        if (!isoString || !isoString.trim()) return '';
        const d = new Date(isoString);
        return Number.isNaN(d.getTime()) ? isoString : formatEuropeanDateTime(d);
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

    const handleDownloadTemplate = () => {
        downloadPurchaseOrderTemplate();
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
                <PurchaseOrderSearchFilters
                    initialFilters={appliedFilters}
                    statusOptions={PURCHASE_ORDER_STATUSES}
                    resultCount={filteredOrders.length}
                    totalCount={orders.length}
                    onApply={setAppliedFilters}
                    statusLabel={purchaseOrderStatusLabel}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('purchaseOrderOrderer')}</TableCell>
                                <TableCell>{t('catalogueId')}</TableCell>
                                <TableCell>{t('currency')}</TableCell>
                                <TableCell>{t('status')}</TableCell>
                                <TableCell>{t('deliveryDate')}</TableCell>
                                <TableCell>{t('deliveryTerms')}</TableCell>
                                <TableCell>{t('shippingAddress')}</TableCell>
                                <TableCell>{t('comment')}</TableCell>
                                <TableCell align="center">{t('purchaseOrderInternalStockColumn')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center">
                                        {t('purchaseOrderFilterEmpty')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>{order.customer?.companyName}</TableCell>
                                    <TableCell>{catalogueSummary(order)}</TableCell>
                                    <TableCell>{order.currency}</TableCell>
                                    <TableCell>{purchaseOrderStatusLabel(order.orderStatus, t)}</TableCell>
                                    <TableCell>{formatDeliveryDate(order.deliveryDate)}</TableCell>
                                    <TableCell>{order.deliveryTerms}</TableCell>
                                    <TableCell>{order.shippingAddress}</TableCell>
                                    <TableCell>{order.comment}</TableCell>
                                    <TableCell align="center">
                                        {order.internalStockDemand ? t('yes') : '—'}
                                    </TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewDetails(order)}
                                                sx={tableActionIconButtonSx.view}
                                                title={t('viewPurchaseOrderDetails')}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditClick(order)}
                                                sx={tableActionIconButtonSx.edit}
                                                title={t('editPurchaseOrder')}
                                                disabled={
                                                    purchaseOrderLockedByWorkOrder(order)
                                                    || order.orderStatus === 'REJECTED'
                                                    || order.orderStatus === 'CANCELLED'
                                                }
                                            >
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRejectClick(order)}
                                                sx={tableActionIconButtonSx.delete}
                                                title={t('rejectPurchaseOrder')}
                                                disabled={!canRejectPurchaseOrder(order)}
                                            >
                                                <BlockIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteClick(order)}
                                                sx={tableActionIconButtonSx.delete}
                                                title={t('deletePurchaseOrder')}
                                                disabled={purchaseOrderLockedByWorkOrder(order)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableActionsRow>
                                    </TableCell>
                                </TableRow>
                            ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <PurchaseOrderFormDialog
                open={formModalOpen}
                editingOrder={editingOrder}
                importDraft={importDraft}
                customers={customers}
                products={products}
                deliveryTermsSelectOptions={deliveryTermsSelectOptions}
                onClose={closeFormModal}
                onSaved={handleFormSaved}
            />

            <ConfirmationModal
                open={!!orderToDelete}
                modalMessage={t('confirmDeletePurchaseOrder')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => { setOrderToDelete(null); setDeleteError(null); }}
            />
            <ConfirmationModal
                open={!!orderToReject}
                modalMessage={t('confirmRejectPurchaseOrder')}
                onConfirm={handleConfirmReject}
                onModalClose={() => setOrderToReject(null)}
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
                                    <Typography variant="body2"><strong>{t('purchaseOrderOrderer')}:</strong> {detailsOrder.customer?.companyName ?? '—'}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{t('currency')}:</strong> {detailsOrder.currency ?? '—'}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Typography variant="body2"><strong>{t('deliveryDate')}:</strong> {formatDeliveryDate(detailsOrder.deliveryDate)}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{t('deliveryTerms')}:</strong> {detailsOrder.deliveryTerms || '—'}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Typography variant="body2"><strong>{t('shippingAddress')}:</strong> {detailsOrder.shippingAddress || '—'}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{t('comment')}:</strong> {detailsOrder.comment || '—'}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        <strong>{t('purchaseOrderInternalStockColumn')}:</strong>{' '}
                                        {detailsOrder.internalStockDemand ? t('yes') : t('no')}
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('productOrders')}</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('product')}</TableCell>
                                        <TableCell>{t('catalogueId')}</TableCell>
                                        <TableCell align="right">{t('quantity')}</TableCell>
                                        <TableCell align="right">{t('pricePerUnit')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(detailsOrder.productOrderList || []).map((po, idx) => (
                                        <TableRow key={po.id ?? idx}>
                                            <TableCell>{po.product?.name ?? '—'}</TableCell>
                                            <TableCell>{po.product?.reference ?? '—'}</TableCell>
                                            <TableCell align="right">{po.quantity ?? 0}</TableCell>
                                            <TableCell align="right">{formatPricePerUnit(po.pricePerUnit)}</TableCell>
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
                                    { key: 'REJECTED', label: t('stateRejected'), time: detailsOrder.rejectedAt },
                                ].map((item) => {
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

