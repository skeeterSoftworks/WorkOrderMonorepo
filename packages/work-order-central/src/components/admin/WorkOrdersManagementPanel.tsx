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
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {WorkOrderTO, PurchaseOrderTO, ProductOrderTO, MachineTO, MachineBookingTO} from 'sf-common/src/models/ApiRequests';
import type {TFunction} from 'i18next';
import { formatEuropeanDate, formatEuropeanDateTime } from 'sf-common/src/util/DateUtils';
import {Server, ConfirmationModal} from 'sf-common';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx
} from '../shared/tableActions';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

/** Normalize PO delivery date for HTML date input (yyyy-MM-dd). */
function purchaseOrderDeliveryToDueDateInput(
    deliveryDate: PurchaseOrderTO['deliveryDate']
): string {
    if (deliveryDate == null) return '';
    if (typeof deliveryDate === 'string') {
        return deliveryDate.length >= 10 ? deliveryDate.substring(0, 10) : deliveryDate;
    }
    if (Array.isArray(deliveryDate) && deliveryDate.length >= 3) {
        const [y, m, d] = deliveryDate;
        const mm = String(m).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }
    return '';
}

function productOrderLineLabel(line: ProductOrderTO): string {
    const ref = line.product?.reference?.trim();
    const name = line.product?.name?.trim();
    const qty = line.quantity != null ? `×${line.quantity}` : '';
    const core = [ref, name].filter(Boolean).join(' · ') || (line.id != null ? `#${line.id}` : '');
    return qty ? `${core} ${qty}` : core;
}

/** Lines that can get a work order: unused lines, plus the line currently edited. */
function getSelectableProductLines(
    purchaseOrderId: number | undefined,
    purchaseOrders: PurchaseOrderTO[],
    workOrders: WorkOrderTO[],
    editingWorkOrderId: number | undefined
): ProductOrderTO[] {
    if (purchaseOrderId == null) return [];
    const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
    const lines = (po?.productOrderList ?? []).filter((l) => l.id != null) as ProductOrderTO[];
    const usedLineIds = new Set(
        workOrders
            .filter((w) => editingWorkOrderId == null || w.id !== editingWorkOrderId)
            .map((w) => w.productOrderId)
            .filter((id): id is number => id != null)
    );
    const editing = editingWorkOrderId != null ? workOrders.find((w) => w.id === editingWorkOrderId) : undefined;
    return lines.filter(
        (l) =>
            l.id != null &&
            (!usedLineIds.has(l.id) || (editing?.productOrderId != null && l.id === editing.productOrderId))
    );
}

function workOrderLineDisplay(wo: WorkOrderTO): string {
    const ref = wo.productReference?.trim();
    const name = wo.productName?.trim();
    const parts = [ref, name].filter(Boolean);
    if (parts.length) return parts.join(' · ');
    return wo.productOrderId != null ? `#${wo.productOrderId}` : '—';
}

function isWorkOrderComplete(wo: WorkOrderTO): boolean {
    return wo.state === 'COMPLETE';
}

function workOrderStateDisplay(wo: WorkOrderTO, t: TFunction): string {
    if (wo.state === 'COMPLETE') return t('workOrderStateComplete');
    if (wo.state === 'INCOMPLETE') return t('workOrderStateIncomplete');
    return t('workOrderStateIncomplete');
}

function workOrderProgress(wo: WorkOrderTO, purchaseOrders: PurchaseOrderTO[]): { pct: number | null; label: string } {
    const produced = wo.producedGoodQuantity ?? 0;
    const required =
        wo.requiredQuantity ??
        (wo.productOrderId != null
            ? purchaseOrders
                  .flatMap((p) => p.productOrderList ?? [])
                  .find((l) => l.id === wo.productOrderId)?.quantity
            : undefined);

    if (required == null || required <= 0) return { pct: null, label: '—' };
    const raw = (produced / required) * 100;
    const pct = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
    return { pct, label: `${Math.min(produced, required)}/${required}` };
}

function findLineContext(
    wo: WorkOrderTO,
    purchaseOrders: PurchaseOrderTO[]
): { line: ProductOrderTO; po: PurchaseOrderTO } | null {
    if (wo.productOrderId == null) return null;
    for (const po of purchaseOrders) {
        const line = po.productOrderList?.find((l) => l.id === wo.productOrderId);
        if (line) return { line, po };
    }
    return null;
}

/** Machine IDs linked to the product on this work order's purchase-order line (from loaded PO data). */
function getProductMachineIdsForSchedule(
    wo: WorkOrderTO | null | undefined,
    purchaseOrders: PurchaseOrderTO[]
): { ids: number[]; lineFound: boolean } {
    if (!wo?.productOrderId) {
        return { ids: [], lineFound: false };
    }
    const ctx = findLineContext(wo, purchaseOrders);
    if (!ctx) {
        return { ids: [], lineFound: false };
    }
    const raw = ctx.line.product?.machineIds;
    const ids = (raw ?? []).filter((id): id is number => id != null);
    return { ids, lineFound: true };
}

function formatDateTime(value: string | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : formatEuropeanDateTime(d);
}

function bookingTypeTranslationKey(type: string | undefined): string {
    switch (type) {
        case 'PRODUCTION':
            return 'bookingTypeProduction';
        case 'MAINTENANCE':
            return 'bookingTypeMaintenance';
        case 'SETUP':
            return 'bookingTypeSetup';
        case 'OTHER':
            return 'bookingTypeOther';
        default:
            return '';
    }
}

function bookingStatusTranslationKey(status: string | undefined): string {
    switch (status) {
        case 'PLANNED':
            return 'bookingStatusPlanned';
        case 'CONFIRMED':
            return 'bookingStatusConfirmed';
        case 'COMPLETED':
            return 'bookingStatusCompleted';
        case 'CANCELLED':
            return 'bookingStatusCancelled';
        default:
            return '';
    }
}

function machineDisplayName(b: MachineBookingTO, machines: MachineTO[]): string {
    const n = b.machineName?.trim();
    if (n) return n;
    const m = machines.find((x) => x.id === b.machineId);
    return m?.machineName ?? (b.machineId != null ? `#${b.machineId}` : '—');
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', py: 0.25}}>
            <Typography variant="body2" color="text.secondary" sx={{minWidth: 160}}>
                {label}
            </Typography>
            <Typography variant="body2" component="div" sx={{flex: 1}}>
                {value ?? '—'}
            </Typography>
        </Box>
    );
}

export function WorkOrdersManagementPanel() {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [workOrders, setWorkOrders] = useState<WorkOrderTO[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderTO[]>([]);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>(undefined);
    const [productOrderLineId, setProductOrderLineId] = useState<number | undefined>(undefined);
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [comment, setComment] = useState('');
    const [orderToDelete, setOrderToDelete] = useState<WorkOrderTO | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleWorkOrder, setScheduleWorkOrder] = useState<WorkOrderTO | null>(null);
    const [scheduleMachineId, setScheduleMachineId] = useState<number | undefined>(undefined);
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');
    const [scheduleType, setScheduleType] = useState<'PRODUCTION' | 'MAINTENANCE' | 'SETUP' | 'OTHER'>('PRODUCTION');
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsWorkOrder, setDetailsWorkOrder] = useState<WorkOrderTO | null>(null);
    const [detailsBookings, setDetailsBookings] = useState<MachineBookingTO[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    useEffect(() => {
        loadWorkOrders();
        loadPurchaseOrders();
        Server.getAllMachines(
            (response: any) => {
                let data: MachineTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setMachines(data);
            },
            () => {
            },
        );
    }, []);

    useEffect(() => {
        const presetId = searchParams.get('createFromPurchaseOrder');
        if (presetId != null && presetId !== '' && !Number.isNaN(Number(presetId))) {
            const id = Number(presetId);
            setSelectedId(undefined);
            setPurchaseOrderId(id);
            setProductOrderLineId(undefined);
            setStartDate('');
            setEndDate('');
            setComment('');
            setFormModalOpen(true);
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    // When creating, keep due date aligned with selected PO delivery date (also covers URL preset after PO list loads).
    useEffect(() => {
        if (!formModalOpen || selectedId) return;
        if (!purchaseOrderId) {
            setDueDate('');
            return;
        }
        const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
        setDueDate(po ? purchaseOrderDeliveryToDueDateInput(po.deliveryDate) : '');
    }, [formModalOpen, selectedId, purchaseOrderId, purchaseOrders]);

    const loadPurchaseOrders = () => {
        Server.getAllPurchaseOrders(
            (response: any) => {
                let data: PurchaseOrderTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setPurchaseOrders(data);
            },
            () => {
            },
        );
    };

    const loadWorkOrders = () => {
        Server.getAllWorkOrders(
            (response: any) => {
                let data: WorkOrderTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setWorkOrders(data);
            },
            () => {
            },
        );
    };

    const resetForm = () => {
        setSelectedId(undefined);
        setPurchaseOrderId(undefined);
        setProductOrderLineId(undefined);
        setDueDate('');
        setStartDate('');
        setEndDate('');
        setComment('');
    };

    const openFormModal = () => {
        resetForm();
        setFormModalOpen(true);
    };

    const handleEditClick = (wo: WorkOrderTO) => {
        if (isWorkOrderComplete(wo)) return;
        setSelectedId(wo.id);
        let poId = wo.purchaseOrderId;
        if (poId == null && wo.productOrderId != null) {
            const po = purchaseOrders.find((p) =>
                (p.productOrderList ?? []).some((l) => l.id === wo.productOrderId)
            );
            poId = po?.id;
        }
        setPurchaseOrderId(poId);
        setProductOrderLineId(wo.productOrderId);
        setDueDate(wo.dueDate ? wo.dueDate.substring(0, 10) : '');
        setStartDate(wo.startDate ? wo.startDate.substring(0, 10) : '');
        setEndDate(wo.endDate ? wo.endDate.substring(0, 10) : '');
        setComment(wo.comment || '');
        setFormModalOpen(true);
    };

    const handleSubmit = () => {
        if (selectedId != null) {
            const existing = workOrders.find((w) => w.id === selectedId);
            if (existing && isWorkOrderComplete(existing)) {
                return;
            }
        }
        if (productOrderLineId == null) {
            return;
        }
        const payload: WorkOrderTO = {
            id: selectedId,
            productOrderId: productOrderLineId,
            dueDate: dueDate || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            comment: comment || undefined,
        };

        const onSuccess = () => {
            loadWorkOrders();
            resetForm();
            setFormModalOpen(false);
            toastActionSuccess(selectedId ? t('toastWorkOrderUpdated') : t('toastWorkOrderAdded'));
        };

        if (selectedId) {
            Server.editWorkOrder(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addWorkOrder(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    const handleDeleteClick = (wo: WorkOrderTO) => {
        if (isWorkOrderComplete(wo)) return;
        setOrderToDelete(wo);
    };

    const closeDetailsModal = () => {
        setDetailsModalOpen(false);
        setDetailsWorkOrder(null);
        setDetailsBookings([]);
        setDetailsLoading(false);
        setDetailsError(null);
    };

    const openDetailsModal = (wo: WorkOrderTO) => {
        if (wo.id == null) return;
        setDetailsWorkOrder(wo);
        setDetailsBookings([]);
        setDetailsError(null);
        setDetailsLoading(true);
        setDetailsModalOpen(true);
        Server.getMachineBookingsForWorkOrder(
            wo.id,
            (response: any) => {
                let data: MachineBookingTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setDetailsBookings(data);
                setDetailsLoading(false);
            },
            () => {
                setDetailsLoading(false);
                setDetailsError(t('errorLoadingWorkOrderDetails'));
            }
        );
    };

    const openScheduleModal = (wo: WorkOrderTO) => {
        if (isWorkOrderComplete(wo)) return;
        setScheduleWorkOrder(wo);
        setScheduleMachineId(undefined);
        setScheduleStart('');
        setScheduleEnd('');
        setScheduleType('PRODUCTION');
        setScheduleError(null);
        setScheduleModalOpen(true);
    };

    const closeScheduleModal = () => {
        setScheduleModalOpen(false);
        setScheduleWorkOrder(null);
        setScheduleError(null);
    };

    const handleScheduleSubmit = () => {
        if (scheduleWorkOrder && isWorkOrderComplete(scheduleWorkOrder)) {
            setScheduleError(t('workOrderCompleteActionDisabled'));
            return;
        }
        if (!scheduleWorkOrder?.id || !scheduleStart || !scheduleEnd) {
            setScheduleError(t('allFieldsRequired'));
            return;
        }
        const { ids: allowedIds, lineFound } = getProductMachineIdsForSchedule(
            scheduleWorkOrder,
            purchaseOrders
        );
        const allowed = new Set(allowedIds);
        if (!lineFound || scheduleWorkOrder.productOrderId == null) {
            setScheduleError(t('scheduleModalLineNotFound'));
            return;
        }
        if (allowed.size === 0) {
            setScheduleError(t('noMachinesLinkedToProduct'));
            return;
        }
        if (scheduleMachineId == null || !allowed.has(scheduleMachineId)) {
            setScheduleError(t('selectAllowedMachineForProduct'));
            return;
        }
        const booking: MachineBookingTO = {
            machineId: scheduleMachineId,
            workOrderId: scheduleWorkOrder.id,
            startDateTime: scheduleStart,
            endDateTime: scheduleEnd,
            type: scheduleType,
            comment: undefined,
        };
        Server.addMachineBooking(
            booking,
            () => {
                toastActionSuccess(t('toastWorkOrderScheduled'));
                closeScheduleModal();
            },
            (err: any) => {
                const body = err?.response?.data;
                setScheduleError(typeof body === 'string' ? body : t('errorSchedulingMachine'));
                toastServerError(err, t);
            },
        );
    };

    const handleConfirmDelete = () => {
        if (orderToDelete?.id == null) {
            setOrderToDelete(null);
            return;
        }
        Server.deleteWorkOrder(
            Number(orderToDelete.id),
            () => {
                loadWorkOrders();
                setOrderToDelete(null);
                toastActionSuccess(t('toastWorkOrderDeleted'));
            },
            (err: unknown) => {
                setOrderToDelete(null);
                toastServerError(err, t);
            },
        );
    };

    const formatDate = (value: string | undefined): string => {
        if (!value) return '';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : formatEuropeanDate(d);
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        resetForm();
    };

    const purchaseOrderLabel = (po: PurchaseOrderTO) => {
        const lines = po.productOrderList || [];
        const cat =
            lines.map((l) => l.product?.reference).find((r) => r && r.trim() !== '') ||
            lines[0]?.product?.name ||
            '';
        const cust = po.customer?.companyName || '';
        const core = cat || `#${po.id}`;
        return cust ? `${core} (${cust})` : core;
    };

    const scheduleProductMachines = useMemo(
        () => getProductMachineIdsForSchedule(scheduleWorkOrder, purchaseOrders),
        [scheduleWorkOrder, purchaseOrders]
    );

    const machinesForSchedulePicker = useMemo(() => {
        const allowed = new Set(scheduleProductMachines.ids);
        if (allowed.size === 0) return [];
        return machines.filter((m) => m.id != null && allowed.has(m.id));
    }, [machines, scheduleProductMachines.ids]);

    const scheduleMachineHelperText = (() => {
        if (!scheduleWorkOrder) return '';
        if (scheduleWorkOrder.productOrderId == null) {
            return t('scheduleModalMissingProductLine');
        }
        if (!scheduleProductMachines.lineFound) {
            return t('scheduleModalLineNotFound');
        }
        if (scheduleProductMachines.ids.length === 0) {
            return t('noMachinesLinkedToProduct');
        }
        return t('scheduleOnlyProductMachinesHelp');
    })();

    return (
        <Box sx={{mt: 3}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Typography variant="h6">{t('workOrdersList')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon/>} onClick={openFormModal}>
                    {t('createNewWorkOrder')}
                </Button>
            </Box>

            <Alert severity="info" variant="outlined" sx={{mb: 2}}>
                {t('workOrderMachineAssignmentNote')}
            </Alert>

            <Paper sx={{p: 2}}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('purchaseOrder')}</TableCell>
                                <TableCell>{t('productOrderLine')}</TableCell>
                                <TableCell>{t('workOrderState')}</TableCell>
                                <TableCell>{t('dueDate')}</TableCell>
                                <TableCell>{t('startDate')}</TableCell>
                                <TableCell>{t('endDate')}</TableCell>
                                <TableCell>{t('comment')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {workOrders.map((wo) => (
                                <TableRow key={wo.id}>
                                    <TableCell>
                                        {purchaseOrderLabel(purchaseOrders.find((p) => p.id === wo.purchaseOrderId) || {id: wo.purchaseOrderId})}
                                    </TableCell>
                                    <TableCell>{workOrderLineDisplay(wo)}</TableCell>
                                    <TableCell sx={{minWidth: 160}}>
                                        {isWorkOrderComplete(wo) ? (
                                            workOrderStateDisplay(wo, t)
                                        ) : (
                                            (() => {
                                                const p = workOrderProgress(wo, purchaseOrders);
                                                return (
                                                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5}}>
                                                        <Typography variant="body2">
                                                            {workOrderStateDisplay(wo, t)}
                                                        </Typography>
                                                        {p.pct == null ? (
                                                            <Typography variant="caption" color="text.secondary">
                                                                —
                                                            </Typography>
                                                        ) : (
                                                            <>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={p.pct}
                                                                    sx={{height: 6, borderRadius: 1}}
                                                                />
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{display: 'flex', justifyContent: 'space-between'}}
                                                                >
                                                                    <span>{p.label}</span>
                                                                    <span>{Math.round(p.pct)}%</span>
                                                                </Typography>
                                                            </>
                                                        )}
                                                    </Box>
                                                );
                                            })()
                                        )}
                                    </TableCell>
                                    <TableCell>{formatDate(wo.dueDate)}</TableCell>
                                    <TableCell>{formatDate(wo.startDate)}</TableCell>
                                    <TableCell>{formatDate(wo.endDate)}</TableCell>
                                    <TableCell>{wo.comment}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton
                                                size="small"
                                                onClick={() => openDetailsModal(wo)}
                                                sx={tableActionIconButtonSx.view}
                                                title={t('viewWorkOrderDetails')}
                                            >
                                                <InfoOutlinedIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditClick(wo)}
                                                sx={tableActionIconButtonSx.edit}
                                                disabled={isWorkOrderComplete(wo)}
                                                title={
                                                    isWorkOrderComplete(wo)
                                                        ? t('workOrderCompleteActionDisabled')
                                                        : t('editWorkOrder')
                                                }
                                            >
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => openScheduleModal(wo)}
                                                sx={{color: "orange"}}
                                                disabled={isWorkOrderComplete(wo)}
                                                title={
                                                    isWorkOrderComplete(wo)
                                                        ? t('workOrderCompleteActionDisabled')
                                                        : t('scheduleOnMachine')
                                                }
                                            >
                                                <EngineeringIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteClick(wo)}
                                                sx={tableActionIconButtonSx.delete}
                                                disabled={isWorkOrderComplete(wo)}
                                                title={
                                                    isWorkOrderComplete(wo)
                                                        ? t('workOrderCompleteActionDisabled')
                                                        : t('deleteWorkOrder')
                                                }
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableActionsRow>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={formModalOpen} onClose={closeFormModal} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    {selectedId ? t('editWorkOrder') : t('createNewWorkOrder')}
                    <IconButton size="small" onClick={closeFormModal} aria-label={t('close')}>
                        <CloseIcon/>
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box component="form" sx={{display: 'flex', flexDirection: 'column', gap: 2, pt: 1}}>
                        <TextField
                            select
                            label={t('purchaseOrder')}
                            value={purchaseOrderId ?? ''}
                            onChange={(e) => {
                                const id = e.target.value ? Number(e.target.value) : undefined;
                                setPurchaseOrderId(id);
                                setProductOrderLineId(undefined);
                                if (!selectedId) {
                                    const po = id != null ? purchaseOrders.find((p) => p.id === id) : undefined;
                                    setDueDate(po ? purchaseOrderDeliveryToDueDateInput(po.deliveryDate) : '');
                                }
                            }}
                            size="small"
                            fullWidth
                            required
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {purchaseOrders.map((po) => (
                                <MenuItem key={po.id} value={po.id}>
                                    {purchaseOrderLabel(po)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('productOrderLine')}
                            value={productOrderLineId ?? ''}
                            onChange={(e) =>
                                setProductOrderLineId(e.target.value ? Number(e.target.value) : undefined)
                            }
                            size="small"
                            fullWidth
                            required
                            disabled={purchaseOrderId == null}
                            helperText={
                                purchaseOrderId == null
                                    ? t('productOrderLineSelectFirst')
                                    : t('productOrderLineHelper')
                            }
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {getSelectableProductLines(
                                purchaseOrderId,
                                purchaseOrders,
                                workOrders,
                                selectedId
                            ).map((line) => (
                                <MenuItem key={line.id} value={line.id}>
                                    {productOrderLineLabel(line)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label={t('dueDate')}
                            type="date"
                            value={dueDate}
                            onChange={selectedId ? (e) => setDueDate(e.target.value) : () => {}}
                            size="small"
                            fullWidth
                            InputLabelProps={{shrink: true}}
                            InputProps={selectedId ? undefined : {readOnly: true}}
                            helperText={!selectedId ? t('dueDateFromPurchaseOrderDelivery') : undefined}
                        />
                        <TextField
                            label={t('startDate')}
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{shrink: true}}
                        />
                        <TextField
                            label={t('endDate')}
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{shrink: true}}
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
                        <Box sx={{display: 'flex', gap: 1, mt: 2}}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSubmit}
                                disabled={productOrderLineId == null}
                            >
                                {selectedId ? t('editWorkOrder') : t('addWorkOrder')}
                            </Button>
                            <Button variant="outlined" onClick={closeFormModal}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                open={!!orderToDelete}
                modalMessage={t('confirmDeleteWorkOrder')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setOrderToDelete(null)}
            />

            <Dialog open={detailsModalOpen} onClose={closeDetailsModal} maxWidth="md" fullWidth scroll="paper">
                <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    {t('workOrderDetails')}
                    <IconButton size="small" onClick={closeDetailsModal} aria-label={t('close')}>
                        <CloseIcon/>
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {detailsLoading && (
                        <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}>
                            <CircularProgress size={32} aria-label={t('loadingDetails')}/>
                        </Box>
                    )}
                    {!detailsLoading && detailsWorkOrder && (
                        <Stack spacing={2} sx={{pt: 0.5}}>
                            {detailsError && (
                                <Typography color="error" variant="body2">
                                    {detailsError}
                                </Typography>
                            )}
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('workOrderSummarySection')}
                            </Typography>
                            {(() => {
                                const ctx = findLineContext(detailsWorkOrder, purchaseOrders);
                                const poLabel = detailsWorkOrder.purchaseOrderId
                                    ? purchaseOrderLabel(
                                          purchaseOrders.find((p) => p.id === detailsWorkOrder.purchaseOrderId) || {
                                              id: detailsWorkOrder.purchaseOrderId,
                                          }
                                      )
                                    : ctx
                                      ? purchaseOrderLabel(ctx.po)
                                      : '—';
                                return (
                                    <>
                                        <DetailField label={t('workOrder')} value={detailsWorkOrder.id}/>
                                        <DetailField
                                            label={t('workOrderState')}
                                            value={workOrderStateDisplay(detailsWorkOrder, t)}
                                        />
                                        <DetailField label={t('purchaseOrder')} value={poLabel}/>
                                        <DetailField
                                            label={t('productOrderLine')}
                                            value={workOrderLineDisplay(detailsWorkOrder)}
                                        />
                                        {ctx?.line?.quantity != null && (
                                            <DetailField label={t('quantity')} value={ctx.line.quantity}/>
                                        )}
                                        {ctx?.line?.pricePerUnit != null && (
                                            <DetailField label={t('pricePerUnit')} value={ctx.line.pricePerUnit}/>
                                        )}
                                        <DetailField label={t('dueDate')} value={formatDate(detailsWorkOrder.dueDate)}/>
                                        <DetailField
                                            label={t('startDate')}
                                            value={formatDate(detailsWorkOrder.startDate)}
                                        />
                                        <DetailField label={t('endDate')} value={formatDate(detailsWorkOrder.endDate)}/>
                                        <DetailField
                                            label={t('comment')}
                                            value={detailsWorkOrder.comment?.trim() ? detailsWorkOrder.comment : '—'}
                                        />
                                    </>
                                );
                            })()}
                            <Divider/>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('machinesForWorkOrderTitle')}
                            </Typography>
                            {detailsBookings.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>{t('machineName')}</TableCell>
                                                <TableCell>{t('startDateTime')}</TableCell>
                                                <TableCell>{t('endDateTime')}</TableCell>
                                                <TableCell>{t('bookingType')}</TableCell>
                                                <TableCell>{t('status')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {detailsBookings.map((b) => {
                                                const typeKey = bookingTypeTranslationKey(b.type);
                                                const statusKey = bookingStatusTranslationKey(b.status);
                                                return (
                                                    <TableRow key={b.id ?? `${b.machineId}-${b.startDateTime}`}>
                                                        <TableCell>{machineDisplayName(b, machines)}</TableCell>
                                                        <TableCell>{formatDateTime(b.startDateTime)}</TableCell>
                                                        <TableCell>{formatDateTime(b.endDateTime)}</TableCell>
                                                        <TableCell>
                                                            {typeKey ? t(typeKey) : b.type ?? '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {statusKey ? t(statusKey) : b.status ?? '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : !detailsError ? (
                                <Typography variant="body2" color="text.secondary">
                                    {t('noMachineBookingsForWorkOrder')}
                                </Typography>
                            ) : null}
                            <Box sx={{display: 'flex', justifyContent: 'flex-end', mt: 1}}>
                                <Button variant="outlined" onClick={closeDetailsModal}>
                                    {t('close')}
                                </Button>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={scheduleModalOpen} onClose={closeScheduleModal} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    {t('scheduleMachineForWorkOrder')}
                    <IconButton size="small" onClick={closeScheduleModal} aria-label={t('close')}>
                        <CloseIcon/>
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, pt: 1}}>
                        <Typography variant="body2">
                            {t('purchaseOrder')}:{' '}
                            {scheduleWorkOrder?.purchaseOrderId != null
                                ? purchaseOrderLabel(
                                      purchaseOrders.find((p) => p.id === scheduleWorkOrder.purchaseOrderId) || {
                                          id: scheduleWorkOrder.purchaseOrderId,
                                      }
                                  )
                                : '—'}
                        </Typography>
                        <Typography variant="body2">
                            {t('productOrderLine')}:{' '}
                            {scheduleWorkOrder ? workOrderLineDisplay(scheduleWorkOrder) : '—'}
                        </Typography>
                        <Typography variant="body2">
                            {t('workOrder')}: {scheduleWorkOrder?.id ?? '—'}
                        </Typography>
                        <TextField
                            select
                            label={t('machine')}
                            value={scheduleMachineId ?? ''}
                            onChange={(e) => setScheduleMachineId(e.target.value ? Number(e.target.value) : undefined)}
                            size="small"
                            fullWidth
                            disabled={machinesForSchedulePicker.length === 0}
                            helperText={scheduleMachineHelperText}
                            FormHelperTextProps={{
                                sx: {
                                    color:
                                        machinesForSchedulePicker.length === 0 ? 'error.main' : 'text.secondary',
                                },
                            }}
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {machinesForSchedulePicker.map((m) => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.machineName}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label={t('startDateTime')}
                            type="datetime-local"
                            value={scheduleStart}
                            onChange={(e) => setScheduleStart(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{shrink: true}}
                        />
                        <TextField
                            label={t('endDateTime')}
                            type="datetime-local"
                            value={scheduleEnd}
                            onChange={(e) => setScheduleEnd(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{shrink: true}}
                        />
                        <TextField
                            select
                            label={t('bookingType')}
                            value={scheduleType}
                            onChange={(e) => setScheduleType(e.target.value as any)}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="PRODUCTION">{t('bookingTypeProduction')}</MenuItem>
                            <MenuItem value="MAINTENANCE">{t('bookingTypeMaintenance')}</MenuItem>
                            <MenuItem value="SETUP">{t('bookingTypeSetup')}</MenuItem>
                            <MenuItem value="OTHER">{t('bookingTypeOther')}</MenuItem>
                        </TextField>
                        {scheduleError && (
                            <Typography color="error" variant="body2">
                                {scheduleError}
                            </Typography>
                        )}
                        <Box sx={{display: 'flex', gap: 1, mt: 2}}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleScheduleSubmit}
                                disabled={
                                    machinesForSchedulePicker.length === 0 ||
                                    scheduleMachineId == null
                                }
                            >
                                {t('schedule')}
                            </Button>
                            <Button variant="outlined" onClick={closeScheduleModal}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
