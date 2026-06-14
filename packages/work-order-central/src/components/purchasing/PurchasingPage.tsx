import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
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
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';
import BlockIcon from '@mui/icons-material/Block';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import { Server, ConfirmationModal } from 'sf-common';
import type {
    MaterialOrderStatus,
    MaterialOrderTO,
    MaterialProviderTO,
    MaterialTO,
} from 'sf-common/src/models/ApiRequests';
import { toastActionError, toastActionSuccess } from '../../util/actionToast';
import {
    isMaterialOrderStaleForMonitoring,
    MATERIAL_ORDER_STALE_ROW_BACKGROUND,
} from '../../util/materialOrderStale';
import { materialOrderStatusColor } from '../../util/materialOrderStatusColor';
import { MaterialOrderCertificateViewDialog } from './MaterialOrderCertificateViewDialog';
import { MaterialOrderCreateDialog } from './MaterialOrderCreateDialog';
import { MaterialOrderEmailPickerDialog } from './MaterialOrderEmailPickerDialog';
import { MaterialOrderSearchFilters, type MaterialOrderSearchForm } from './MaterialOrderSearchFilters';
import { MaterialOrderStatusDialog } from './MaterialOrderStatusDialog';

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

function formatMaterialOrderMaterialsLabel(order: MaterialOrderTO): string {
    if (order.lines != null && order.lines.length > 0) {
        return order.lines
            .map((line) => {
                const label = line.materialName?.trim() || line.materialCode?.trim() || '—';
                return `${label} (${line.quantity ?? 0})`;
            })
            .join(', ');
    }
    return order.materialName || order.materialCode || '—';
}

function formatMaterialOrderQuantity(order: MaterialOrderTO): string | number {
    if (order.lines != null && order.lines.length > 0) {
        const total = order.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
        return total;
    }
    return order.quantity ?? 0;
}

export function PurchasingPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<MaterialOrderTO[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [materials, setMaterials] = useState<MaterialTO[]>([]);
    const [providers, setProviders] = useState<MaterialProviderTO[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    const [statusDialogOrder, setStatusDialogOrder] = useState<MaterialOrderTO | null>(null);
    const [emailPickOpen, setEmailPickOpen] = useState(false);
    const [emailPickOrder, setEmailPickOrder] = useState<MaterialOrderTO | null>(null);
    const [emailPickProvider, setEmailPickProvider] = useState<MaterialProviderTO | undefined>(undefined);
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
        loadProviders();
    }, []);

    const loadProviders = () => {
        Server.getAllMaterialProviders(
            (response: { data?: MaterialProviderTO[] }) => {
                const data = Array.isArray(response?.data) ? response.data : [];
                setProviders(data.filter((provider): provider is MaterialProviderTO => provider.id != null));
            },
            () => setProviders([]),
        );
    };

    const applyFilters = (filters: MaterialOrderSearchForm) => {
        setTableQuery((prev) => ({ ...prev, page: 0 }));
        setAppliedFilters(filters);
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

    const openCreateDialog = () => setCreateOpen(true);

    const closeCreateDialog = () => setCreateOpen(false);

    const findProviderForOrder = (order: MaterialOrderTO): MaterialProviderTO | undefined => {
        if (order.materialProviderId == null) return undefined;
        return providers.find((provider) => provider.id === order.materialProviderId);
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
        setEmailPickOpen(true);
    };

    const closeMaterialOrderEmailDialog = () => {
        setEmailPickOpen(false);
        setEmailPickOrder(null);
        setEmailPickProvider(undefined);
    };

    const openStatusDialog = (order: MaterialOrderTO) => {
        setStatusDialogOrder(order);
    };

    const closeStatusDialog = () => setStatusDialogOrder(null);

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

    const handleCreateSuccess = (saved: MaterialOrderTO) => {
        refreshOrders();
        const provider = findProviderForOrder(saved);
        openMaterialOrderEmailDialog(saved, provider);
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
                <MaterialOrderSearchFilters
                    initialFilters={appliedFilters}
                    statusOptions={MATERIAL_ORDER_STATUSES}
                    ordersLoading={ordersLoading}
                    resultCount={orders.length}
                    totalElements={totalElements}
                    onApply={applyFilters}
                />
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
                                        <TableCell>{formatMaterialOrderMaterialsLabel(o)}</TableCell>
                                        <TableCell>{o.materialProviderName || '—'}</TableCell>
                                        <TableCell>{formatMaterialOrderQuantity(o)}</TableCell>
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

            <MaterialOrderCreateDialog
                open={createOpen}
                providers={providers}
                materials={materials}
                onClose={closeCreateDialog}
                onCreated={handleCreateSuccess}
            />

            <MaterialOrderEmailPickerDialog
                open={emailPickOpen}
                order={emailPickOrder}
                provider={emailPickProvider}
                onClose={closeMaterialOrderEmailDialog}
            />

            <MaterialOrderStatusDialog
                open={statusDialogOrder != null}
                order={statusDialogOrder}
                onClose={closeStatusDialog}
                onSaved={refreshOrders}
            />

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
