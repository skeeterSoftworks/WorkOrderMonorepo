import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';
import BlockIcon from '@mui/icons-material/Block';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import { Server, ConfirmationModal } from 'sf-common';
import type {
    EmailTemplateCode,
    MaterialOrderStatus,
    MaterialOrderTO,
    MaterialProviderTO,
    MaterialTO,
} from 'sf-common/src/models/ApiRequests';
import { toastActionError, toastActionSuccess, toastServerError } from '../../util/actionToast';
import {
    isMaterialOrderStaleForMonitoring,
    MATERIAL_ORDER_MANUAL_TRANSITION_STATUSES,
    MATERIAL_ORDER_STALE_ROW_BACKGROUND,
} from '../../util/materialOrderStale';
import { materialOrderStatusColor } from '../../util/materialOrderStatusColor';
import { MaterialOrderCertificateViewDialog } from './MaterialOrderCertificateViewDialog';

const CERTIFICATE_ACCEPT = 'application/pdf,image/*';
const DEFAULT_ROWS_PER_PAGE = 25;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

type MaterialOrderSortField =
    | 'code'
    | 'materialName'
    | 'materialProviderName'
    | 'quantity'
    | 'status'
    | 'lastChanged'
    | 'certificatePresent';

type MaterialOrderTableQuery = {
    page: number;
    size: number;
    sortBy: MaterialOrderSortField;
    asc: boolean;
};

function defaultTableQuery(): MaterialOrderTableQuery {
    return {
        page: 0,
        size: DEFAULT_ROWS_PER_PAGE,
        sortBy: 'lastChanged',
        asc: false,
    };
}

function canUploadCertificate(order: MaterialOrderTO): boolean {
    return order.status !== 'REJECTED';
}

function formatMaterialOrderLastChanged(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleString();
}

function materialOrderStatusLocked(order: MaterialOrderTO): boolean {
    return (
        order.status === 'RECEIVED_IN_STOCK'
        || order.status === 'VALIDATED'
        || order.status === 'REJECTED'
    );
}

const MATERIAL_ORDER_STATUSES: MaterialOrderStatus[] = [
    'ORDER_CREATED',
    'ORDER_SENT',
    'ORDER_ACKNOWLEDGED',
    'ORDER_ACCEPTED',
    'IN_TRANSPORT',
    'RECEIVED_IN_STOCK',
    'VALIDATED',
    'REJECTED',
];

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

type MaterialOrderSearchForm = {
    status: string;
    periodFrom: string;
    periodTo: string;
    code: string;
    materialName: string;
    materialProviderName: string;
    certificatePresentOnly: boolean;
};

function defaultSearchForm(): MaterialOrderSearchForm {
    const month = currentMonthDateRange();
    return {
        status: 'ALL',
        periodFrom: month.from,
        periodTo: month.to,
        code: '',
        materialName: '',
        materialProviderName: '',
        certificatePresentOnly: false,
    };
}

function canRejectMaterialOrder(order: MaterialOrderTO): boolean {
    const status = order.status ?? 'ORDER_CREATED';
    return status !== 'RECEIVED_IN_STOCK' && status !== 'VALIDATED' && status !== 'REJECTED';
}

const MATERIAL_ORDER_EMAIL_TEMPLATE_CODES: EmailTemplateCode[] = [
    'MATERIAL_ORDER_INQUIRY',
    'MATERIAL_ORDER_REMINDER',
    'MATERIAL_DELIVERY_LATE',
];

export function PurchasingPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<MaterialOrderTO[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [materials, setMaterials] = useState<MaterialTO[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    const [quantity, setQuantity] = useState('');
    const [materialId, setMaterialId] = useState<number | undefined>(undefined);
    const [materialProviderId, setMaterialProviderId] = useState<number | undefined>(undefined);
    const [statusDialogOrder, setStatusDialogOrder] = useState<MaterialOrderTO | null>(null);
    const [pendingStatus, setPendingStatus] = useState<MaterialOrderStatus>('ORDER_SENT');
    const [emailPickOpen, setEmailPickOpen] = useState(false);
    const [emailPickOrder, setEmailPickOrder] = useState<MaterialOrderTO | null>(null);
    const [emailPickProvider, setEmailPickProvider] = useState<MaterialProviderTO | undefined>(undefined);
    const [selectedEmailTemplate, setSelectedEmailTemplate] =
        useState<EmailTemplateCode>('MATERIAL_ORDER_INQUIRY');
    const [filterDraft, setFilterDraft] = useState<MaterialOrderSearchForm>(defaultSearchForm);
    const [appliedFilters, setAppliedFilters] = useState<MaterialOrderSearchForm>(defaultSearchForm);
    const [tableQuery, setTableQuery] = useState<MaterialOrderTableQuery>(defaultTableQuery);
    const [orderToReject, setOrderToReject] = useState<MaterialOrderTO | null>(null);
    const certificateFileInputRef = useRef<HTMLInputElement>(null);
    const [certificateUploadOrder, setCertificateUploadOrder] = useState<MaterialOrderTO | null>(null);
    const [uploadingCertificateId, setUploadingCertificateId] = useState<number | null>(null);
    const [certificateViewOrder, setCertificateViewOrder] = useState<MaterialOrderTO | null>(null);
    const [certificateViewUrl, setCertificateViewUrl] = useState<string | undefined>(undefined);
    const [certificateViewLoading, setCertificateViewLoading] = useState(false);
    const [certificateViewError, setCertificateViewError] = useState(false);

    const selectedMaterial = useMemo(
        () => materials.find((m) => m.id === materialId),
        [materials, materialId],
    );

    const providerOptions = useMemo<MaterialProviderTO[]>(
        () => (selectedMaterial?.providers ?? []).filter((p): p is MaterialProviderTO => p.id != null),
        [selectedMaterial],
    );

    const canCreate =
        materialId != null &&
        materialProviderId != null &&
        Number(quantity) > 0 &&
        Number.isFinite(Number(quantity));

    const fetchOrders = useCallback((
        filters: MaterialOrderSearchForm,
        query: MaterialOrderTableQuery,
    ) => {
        setOrdersLoading(true);
        Server.searchMaterialOrders(
            {
                page: query.page,
                size: query.size,
                sortBy: query.sortBy,
                asc: query.asc,
                status: filters.status,
                createdFrom: filters.periodFrom || undefined,
                createdTo: filters.periodTo || undefined,
                code: filters.code.trim() || undefined,
                materialName: filters.materialName.trim() || undefined,
                materialProviderName: filters.materialProviderName.trim() || undefined,
                certificatePresent: filters.certificatePresentOnly ? true : undefined,
            },
            (response: { data?: { content?: MaterialOrderTO[]; totalElements?: number } }) => {
                const data = response?.data;
                setOrders(Array.isArray(data?.content) ? data.content : []);
                setTotalElements(data?.totalElements ?? 0);
                setOrdersLoading(false);
            },
            () => {
                setOrders([]);
                setTotalElements(0);
                setOrdersLoading(false);
            },
        );
    }, []);

    const refreshOrders = useCallback(() => {
        fetchOrders(appliedFilters, tableQuery);
    }, [appliedFilters, tableQuery, fetchOrders]);

    useEffect(() => {
        fetchOrders(appliedFilters, tableQuery);
    }, [appliedFilters, tableQuery, fetchOrders]);

    useEffect(() => {
        loadMaterials();
    }, []);

    const applyFilters = () => {
        setTableQuery((prev) => ({ ...prev, page: 0 }));
        setAppliedFilters({ ...filterDraft });
    };

    const handleSort = (field: MaterialOrderSortField) => {
        setTableQuery((prev) => ({
            ...prev,
            page: 0,
            sortBy: field,
            asc: prev.sortBy === field ? !prev.asc : true,
        }));
    };

    const handlePageChange = (_event: unknown, newPage: number) => {
        setTableQuery((prev) => ({ ...prev, page: newPage }));
    };

    const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
        setTableQuery((prev) => ({
            ...prev,
            page: 0,
            size: parseInt(event.target.value, 10),
        }));
    };

    const renderSortableHeader = (field: MaterialOrderSortField, label: string) => {
        const active = tableQuery.sortBy === field;
        return (
            <TableCell
                sortDirection={active ? (tableQuery.asc ? 'asc' : 'desc') : false}
            >
                <TableSortLabel
                    active={active}
                    direction={active ? (tableQuery.asc ? 'asc' : 'desc') : 'asc'}
                    onClick={() => handleSort(field)}
                >
                    {label}
                </TableSortLabel>
            </TableCell>
        );
    };

    const updateFilterDraft = <K extends keyof MaterialOrderSearchForm>(
        key: K,
        value: MaterialOrderSearchForm[K],
    ) => {
        setFilterDraft((prev) => ({ ...prev, [key]: value }));
    };

    const loadMaterials = () => {
        Server.getAllMaterials(
            (response: any) => {
                let data: MaterialTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setMaterials(data);
            },
            () => {},
        );
    };

    const resetCreateForm = () => {
        setQuantity('');
        setMaterialId(undefined);
        setMaterialProviderId(undefined);
    };

    const openCreateDialog = () => {
        resetCreateForm();
        setCreateOpen(true);
    };

    const closeCreateDialog = () => {
        setCreateOpen(false);
    };

    const findProviderForOrder = (order: MaterialOrderTO): MaterialProviderTO | undefined => {
        if (order.materialId == null || order.materialProviderId == null) return undefined;
        const material = materials.find((m) => m.id === order.materialId);
        return material?.providers?.find((p) => p.id === order.materialProviderId);
    };

    const openMaterialOrderEmailDialog = (order: MaterialOrderTO, provider?: MaterialProviderTO) => {
        const email = provider?.emailAddress?.trim();
        if (!email) {
            toastActionError(t('materialProviderEmailMissing'));
            return;
        }
        if (order.id == null || !Number.isFinite(order.id)) {
            toastActionError(t('materialOrderEmailNeedsSavedOrder'));
            return;
        }
        setEmailPickOrder(order);
        setEmailPickProvider(provider);
        setSelectedEmailTemplate('MATERIAL_ORDER_INQUIRY');
        setEmailPickOpen(true);
    };

    const closeMaterialOrderEmailDialog = () => {
        setEmailPickOpen(false);
        setEmailPickOrder(null);
        setEmailPickProvider(undefined);
    };

    const confirmMaterialOrderEmail = () => {
        const order = emailPickOrder;
        const provider = emailPickProvider;
        const email = provider?.emailAddress?.trim();
        if (!order?.id || !email) return;
        Server.renderMaterialOrderEmail(
            selectedEmailTemplate,
            order.id,
            (resp) => {
                const subject = resp.data.subject ?? '';
                const body = resp.data.body ?? '';
                const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailto;
                closeMaterialOrderEmailDialog();
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    const openStatusDialog = (order: MaterialOrderTO) => {
        const initial =
            order.status && MATERIAL_ORDER_MANUAL_TRANSITION_STATUSES.includes(order.status)
                ? order.status
                : 'ORDER_SENT';
        setPendingStatus(initial);
        setStatusDialogOrder(order);
    };

    const closeStatusDialog = () => setStatusDialogOrder(null);

    const submitStatusTransition = () => {
        const id = statusDialogOrder?.id;
        if (id == null || !Number.isFinite(id)) return;
        Server.transitionMaterialOrderStatus(
            id,
            pendingStatus,
            () => {
                refreshOrders();
                closeStatusDialog();
                toastActionSuccess(t('toastMaterialOrderStatusUpdated'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    const handleConfirmReject = () => {
        if (!orderToReject?.id) {
            setOrderToReject(null);
            return;
        }
        Server.rejectMaterialOrder(
            Number(orderToReject.id),
            () => {
                refreshOrders();
                setOrderToReject(null);
                toastActionSuccess(t('toastMaterialOrderRejected'));
            },
            (err: unknown) => {
                const body = (err as { response?: { data?: unknown } })?.response?.data;
                const msg =
                    body === 'MATERIAL_ORDER_HAS_RECEPTION'
                        ? t('materialOrderHasReceptionCannotReject')
                        : body === 'MATERIAL_ORDER_REJECT_NOT_ALLOWED'
                          ? t('materialOrderRejectNotAllowed')
                          : typeof body === 'string'
                            ? body
                            : t('msg_errorRejectingMaterialOrder');
                setOrderToReject(null);
                toastActionError(msg);
            },
        );
    };

    const openCertificateView = (order: MaterialOrderTO) => {
        if (order.id == null || !Number.isFinite(order.id)) return;
        setCertificateViewOrder(order);
        setCertificateViewUrl(undefined);
        setCertificateViewLoading(true);
        setCertificateViewError(false);
        Server.getMaterialOrderCertificate(
            order.id,
            (response: unknown) => {
                const data = (response as { data?: { certificateBase64?: string } })?.data;
                setCertificateViewUrl(data?.certificateBase64);
                setCertificateViewLoading(false);
                setCertificateViewError(!data?.certificateBase64);
            },
            () => {
                setCertificateViewLoading(false);
                setCertificateViewError(true);
            },
        );
    };

    const closeCertificateView = () => {
        setCertificateViewOrder(null);
        setCertificateViewUrl(undefined);
        setCertificateViewLoading(false);
        setCertificateViewError(false);
    };

    const triggerCertificateUpload = (order: MaterialOrderTO) => {
        if (!canUploadCertificate(order) || order.id == null) return;
        setCertificateUploadOrder(order);
        certificateFileInputRef.current?.click();
    };

    const handleCertificateFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const order = certificateUploadOrder;
        event.target.value = '';
        setCertificateUploadOrder(null);
        if (!file || order?.id == null) return;

        const isPdf =
            file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        if (!isPdf && !isImage) {
            toastActionError(t('materialOrderCertificateInvalidType'));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                toastActionError(t('materialOrderCertificateInvalidType'));
                return;
            }
            setUploadingCertificateId(order.id!);
            Server.uploadMaterialOrderCertificate(
                order.id!,
                dataUrl,
                () => {
                    setUploadingCertificateId(null);
                    refreshOrders();
                    toastActionSuccess(t('toastMaterialOrderCertificateUploaded'));
                },
                (err: unknown) => {
                    setUploadingCertificateId(null);
                    const body = (err as { response?: { data?: unknown } })?.response?.data;
                    const msg =
                        typeof body === 'string' && body.length > 0
                            ? t(body, { defaultValue: body })
                            : t('materialOrderCertificateUploadError');
                    toastActionError(msg);
                },
            );
        };
        reader.onerror = () => toastActionError(t('materialOrderCertificateUploadError'));
        reader.readAsDataURL(file);
    };

    const handleCreate = () => {
        if (!canCreate) return;
        const payload = {
            quantity: Math.trunc(Number(quantity)),
            materialId,
            materialProviderId,
        };
        Server.addMaterialOrder(
            payload,
            (response: any) => {
                let saved: MaterialOrderTO | undefined;
                if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                    saved = response.data as MaterialOrderTO;
                }
                refreshOrders();
                closeCreateDialog();
                toastActionSuccess(t('toastMaterialOrderAdded'));
                const effectiveOrder: MaterialOrderTO = saved ?? {
                    ...payload,
                    materialName: selectedMaterial?.name,
                    materialCode: selectedMaterial?.code,
                };
                const provider = providerOptions.find((p) => p.id === materialProviderId);
                openMaterialOrderEmailDialog(effectiveOrder, provider);
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{t('purchasing')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                    {t('createMaterialOrder')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <Box
                    component="form"
                    autoComplete="off"
                    onSubmit={(e) => {
                        e.preventDefault();
                        applyFilters();
                    }}
                    sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}
                >
                    <TextField
                        select
                        label={t('materialOrderStatusFilter')}
                        value={filterDraft.status}
                        onChange={(e) => updateFilterDraft('status', e.target.value)}
                        size="small"
                        sx={{ minWidth: 180 }}
                    >
                        <MenuItem value="ALL">{t('materialOrderStatusFilterAll')}</MenuItem>
                        {MATERIAL_ORDER_STATUSES.map((s) => (
                            <MenuItem key={s} value={s}>
                                {t(`materialOrderStatus_${s}`)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label={t('dateFrom')}
                        type="date"
                        value={filterDraft.periodFrom}
                        onChange={(e) => updateFilterDraft('periodFrom', e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160 }}
                    />
                    <TextField
                        label={t('dateUntil')}
                        type="date"
                        value={filterDraft.periodTo}
                        onChange={(e) => updateFilterDraft('periodTo', e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160 }}
                    />
                    <TextField
                        label={t('materialOrderCode')}
                        value={filterDraft.code}
                        onChange={(e) => updateFilterDraft('code', e.target.value)}
                        size="small"
                        sx={{ minWidth: 140 }}
                    />
                    <TextField
                        label={t('materialName')}
                        value={filterDraft.materialName}
                        onChange={(e) => updateFilterDraft('materialName', e.target.value)}
                        size="small"
                        sx={{ minWidth: 160 }}
                    />
                    <TextField
                        label={t('materialProviderName')}
                        value={filterDraft.materialProviderName}
                        onChange={(e) => updateFilterDraft('materialProviderName', e.target.value)}
                        size="small"
                        sx={{ minWidth: 160 }}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={filterDraft.certificatePresentOnly}
                                onChange={(e) => updateFilterDraft('certificatePresentOnly', e.target.checked)}
                                size="small"
                            />
                        }
                        label={t('materialOrderCertificatePresentOnly')}
                    />
                    <Button type="submit" variant="contained" disabled={ordersLoading}>
                        {t('searchAction')}
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                        {t('materialOrderFilterCount', { count: orders.length, total: totalElements })}
                    </Typography>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {renderSortableHeader('code', t('materialOrderCode'))}
                                {renderSortableHeader('materialName', t('materialName'))}
                                {renderSortableHeader('materialProviderName', t('materialProviderName'))}
                                {renderSortableHeader('quantity', t('quantity'))}
                                {renderSortableHeader('status', t('status'))}
                                {renderSortableHeader('lastChanged', t('purchasingLastChanged'))}
                                {renderSortableHeader('certificatePresent', t('certificate'))}
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ordersLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={28} aria-label={t('loadingDetails')} />
                                    </TableCell>
                                </TableRow>
                            ) : orders.length > 0 ? (
                                orders.map((o) => (
                                    <TableRow
                                        key={o.id ?? `${o.materialId}-${o.materialProviderId}-${o.quantity}`}
                                        sx={{
                                            ...(isMaterialOrderStaleForMonitoring(o)
                                                ? { backgroundColor: MATERIAL_ORDER_STALE_ROW_BACKGROUND }
                                                : {}),
                                        }}
                                    >
                                        <TableCell>{o.code || '—'}</TableCell>
                                        <TableCell>{o.materialName || o.materialCode || '—'}</TableCell>
                                        <TableCell>{o.materialProviderName || '—'}</TableCell>
                                        <TableCell>{o.quantity ?? 0}</TableCell>
                                        <TableCell>
                                            {o.status ? (
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                    sx={{ color: materialOrderStatusColor(o.status), fontWeight: 600 }}
                                                >
                                                    {t(`materialOrderStatus_${o.status}`)}
                                                </Typography>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell>{formatMaterialOrderLastChanged(o.lastChanged)}</TableCell>
                                        <TableCell align="center">
                                            {o.certificatePresent ? (
                                                <IconButton
                                                    size="small"
                                                    title={t('viewCertificate')}
                                                    disabled={o.id == null}
                                                    onClick={() => openCertificateView(o)}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            ) : (
                                                <IconButton
                                                    size="small"
                                                    title={t('uploadCertificate')}
                                                    disabled={
                                                        o.id == null
                                                        || !canUploadCertificate(o)
                                                        || uploadingCertificateId === o.id
                                                    }
                                                    onClick={() => triggerCertificateUpload(o)}
                                                >
                                                    <UploadFileIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                title={t('emailMaterialOrder')}
                                                disabled={o.status === 'REJECTED'}
                                                onClick={() =>
                                                    openMaterialOrderEmailDialog(o, findProviderForOrder(o))
                                                }
                                            >
                                                <EmailOutlinedIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                title={t('materialOrderChangeStatus')}
                                                disabled={
                                                    o.id == null ||
                                                    !Number.isFinite(o.id) ||
                                                    materialOrderStatusLocked(o)
                                                }
                                                onClick={() => openStatusDialog(o)}
                                            >
                                                <PublishedWithChangesOutlinedIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                title={t('rejectMaterialOrder')}
                                                disabled={!canRejectMaterialOrder(o)}
                                                onClick={() => setOrderToReject(o)}
                                            >
                                                <BlockIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('materialOrderFilterEmpty')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={totalElements}
                    page={tableQuery.page}
                    onPageChange={handlePageChange}
                    rowsPerPage={tableQuery.size}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
                    labelRowsPerPage={t('numberOfResultsPerPage')}
                    labelDisplayedRows={({ from, to, count }) =>
                        t('paginationDisplayedRows', {
                            from,
                            to,
                            count: count !== -1 ? count : to,
                        })
                    }
                />
            </Paper>

            <Dialog open={createOpen} onClose={closeCreateDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {t('createMaterialOrder')}
                    <IconButton size="small" onClick={closeCreateDialog} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                        <TextField
                            select
                            label={t('materialName')}
                            value={materialId ?? ''}
                            onChange={(e) => {
                                const nextMaterialId = e.target.value ? Number(e.target.value) : undefined;
                                setMaterialId(nextMaterialId);
                                setMaterialProviderId(undefined);
                            }}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {materials.map((m) => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.name || m.code || m.id}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label={t('materialProviderName')}
                            value={materialProviderId ?? ''}
                            onChange={(e) =>
                                setMaterialProviderId(e.target.value ? Number(e.target.value) : undefined)
                            }
                            size="small"
                            fullWidth
                            disabled={materialId == null}
                            helperText={materialId == null ? t('selectMaterialFirst') : undefined}
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {providerOptions.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.name || p.contactPerson || p.id}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            type="number"
                            label={t('quantity')}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            size="small"
                            fullWidth
                            inputProps={{ min: 1, step: 1 }}
                        />

                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button variant="contained" onClick={handleCreate} disabled={!canCreate}>
                                {t('saveAction')}
                            </Button>
                            <Button variant="outlined" onClick={closeCreateDialog}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={emailPickOpen} onClose={closeMaterialOrderEmailDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {t('emailTemplatePickerTitle')}
                    <IconButton
                        size="small"
                        onClick={closeMaterialOrderEmailDialog}
                        aria-label={t('close')}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('emailTemplatePlaceholdersHint')}
                    </Typography>
                    <FormControl component="fieldset" sx={{ width: '100%' }}>
                        <FormLabel component="legend">{t('emailTemplatePickerChooseLabel')}</FormLabel>
                        <RadioGroup
                            value={selectedEmailTemplate}
                            onChange={(e) =>
                                setSelectedEmailTemplate(e.target.value as EmailTemplateCode)
                            }
                        >
                            {MATERIAL_ORDER_EMAIL_TEMPLATE_CODES.map((code) => (
                                <FormControlLabel
                                    key={code}
                                    value={code}
                                    control={<Radio size="small" />}
                                    label={t(`emailTemplate_${code}`)}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button variant="contained" onClick={confirmMaterialOrderEmail}>
                            {t('emailTemplatePickerOpenMailto')}
                        </Button>
                        <Button variant="outlined" onClick={closeMaterialOrderEmailDialog}>
                            {t('cancel')}
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={statusDialogOrder != null} onClose={closeStatusDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {t('materialOrderStatusTransitionTitle')}
                    <IconButton size="small" onClick={closeStatusDialog} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                        <TextField
                            select
                            label={t('status')}
                            value={pendingStatus}
                            onChange={(e) => setPendingStatus(e.target.value as MaterialOrderStatus)}
                            size="small"
                            fullWidth
                        >
                            {MATERIAL_ORDER_MANUAL_TRANSITION_STATUSES.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {t(`materialOrderStatus_${s}`)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button variant="contained" onClick={submitStatusTransition}>
                                {t('saveAction')}
                            </Button>
                            <Button variant="outlined" onClick={closeStatusDialog}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                open={!!orderToReject}
                modalMessage={t('confirmRejectMaterialOrder')}
                onConfirm={handleConfirmReject}
                onModalClose={() => setOrderToReject(null)}
            />

            <input
                ref={certificateFileInputRef}
                type="file"
                accept={CERTIFICATE_ACCEPT}
                style={{ display: 'none' }}
                onChange={handleCertificateFileSelected}
            />

            <MaterialOrderCertificateViewDialog
                open={certificateViewOrder != null}
                title={
                    certificateViewOrder?.code
                        ? t('materialOrderCertificateTitle', { code: certificateViewOrder.code })
                        : t('materialOrderCertificateTitleGeneric')
                }
                certificateUrl={certificateViewUrl}
                loading={certificateViewLoading}
                loadError={certificateViewError}
                onClose={closeCertificateView}
            />
        </Box>
    );
}
