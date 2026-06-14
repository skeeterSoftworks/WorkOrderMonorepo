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
import {useEffect, useState, type ReactNode} from 'react';
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
import {bookingStatusTranslationKey, bookingTypeTranslationKey} from '../../util/bookingI18n';
import { WorkOrderFormDialog } from './WorkOrderFormDialog';
import { WorkOrderScheduleDialog } from './WorkOrderScheduleDialog';

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

function formatDateTime(value: string | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : formatEuropeanDateTime(d);
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
    const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrderTO | null>(null);
    const [presetPurchaseOrderId, setPresetPurchaseOrderId] = useState<number | undefined>(undefined);
    const [orderToDelete, setOrderToDelete] = useState<WorkOrderTO | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleWorkOrder, setScheduleWorkOrder] = useState<WorkOrderTO | null>(null);
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
            setEditingWorkOrder(null);
            setPresetPurchaseOrderId(Number(presetId));
            setFormModalOpen(true);
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

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

    const closeFormModal = () => {
        setFormModalOpen(false);
        setEditingWorkOrder(null);
        setPresetPurchaseOrderId(undefined);
    };

    const openFormModal = () => {
        setEditingWorkOrder(null);
        setPresetPurchaseOrderId(undefined);
        setFormModalOpen(true);
    };

    const handleEditClick = (wo: WorkOrderTO) => {
        if (isWorkOrderComplete(wo)) return;
        setEditingWorkOrder(wo);
        setPresetPurchaseOrderId(undefined);
        setFormModalOpen(true);
    };

    const handleFormSaved = () => {
        loadWorkOrders();
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
        setScheduleModalOpen(true);
    };

    const closeScheduleModal = () => {
        setScheduleModalOpen(false);
        setScheduleWorkOrder(null);
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

            <WorkOrderFormDialog
                open={formModalOpen}
                workOrder={editingWorkOrder}
                presetPurchaseOrderId={presetPurchaseOrderId}
                purchaseOrders={purchaseOrders}
                workOrders={workOrders}
                onClose={closeFormModal}
                onSaved={handleFormSaved}
            />

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

            <WorkOrderScheduleDialog
                open={scheduleModalOpen}
                workOrder={scheduleWorkOrder}
                purchaseOrders={purchaseOrders}
                machines={machines}
                onClose={closeScheduleModal}
                onScheduled={() => {}}
            />
        </Box>
    );
}
