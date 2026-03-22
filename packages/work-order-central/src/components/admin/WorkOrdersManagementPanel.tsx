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
import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {WorkOrderTO, PurchaseOrderTO, MachineTO, MachineBookingTO} from 'sf-common/src/models/ApiRequests';
import {Server, ConfirmationModal} from 'sf-common';

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

export function WorkOrdersManagementPanel() {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [workOrders, setWorkOrders] = useState<WorkOrderTO[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderTO[]>([]);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>(undefined);
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
        setSelectedId(wo.id);
        setPurchaseOrderId(wo.purchaseOrderId);
        setDueDate(wo.dueDate ? wo.dueDate.substring(0, 10) : '');
        setStartDate(wo.startDate ? wo.startDate.substring(0, 10) : '');
        setEndDate(wo.endDate ? wo.endDate.substring(0, 10) : '');
        setComment(wo.comment || '');
        setFormModalOpen(true);
    };

    const handleSubmit = () => {
        const payload: WorkOrderTO = {
            id: selectedId,
            purchaseOrderId: purchaseOrderId || undefined,
            dueDate: dueDate || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            comment: comment || undefined,
        };

        const onSuccess = () => {
            loadWorkOrders();
            resetForm();
            setFormModalOpen(false);
        };

        if (selectedId) {
            Server.editWorkOrder(payload, onSuccess, () => {
            });
        } else {
            Server.addWorkOrder(payload, onSuccess, () => {
            });
        }
    };

    const handleDeleteClick = (wo: WorkOrderTO) => {
        setOrderToDelete(wo);
    };

    const openScheduleModal = (wo: WorkOrderTO) => {
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
        if (!scheduleWorkOrder?.id || !scheduleMachineId || !scheduleStart || !scheduleEnd) {
            setScheduleError(t('allFieldsRequired'));
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
                closeScheduleModal();
            },
            (err: any) => {
                const body = err?.response?.data;
                setScheduleError(typeof body === 'string' ? body : t('errorSchedulingMachine'));
            }
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
            },
            () => setOrderToDelete(null),
        );
    };

    const formatDate = (value: string | undefined): string => {
        if (!value) return '';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
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

    return (
        <Box sx={{mt: 3}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Typography variant="h6">{t('workOrdersList')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon/>} onClick={openFormModal}>
                    {t('createNewWorkOrder')}
                </Button>
            </Box>

            <Paper sx={{p: 2}}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('purchaseOrder')}</TableCell>
                                <TableCell>{t('dueDate')}</TableCell>
                                <TableCell>{t('startDate')}</TableCell>
                                <TableCell>{t('endDate')}</TableCell>
                                <TableCell>{t('comment')}</TableCell>
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {workOrders.map((wo) => (
                                <TableRow key={wo.id}>
                                    <TableCell>
                                        {purchaseOrderLabel(purchaseOrders.find((p) => p.id === wo.purchaseOrderId) || {id: wo.purchaseOrderId})}
                                    </TableCell>
                                    <TableCell>{formatDate(wo.dueDate)}</TableCell>
                                    <TableCell>{formatDate(wo.startDate)}</TableCell>
                                    <TableCell>{formatDate(wo.endDate)}</TableCell>
                                    <TableCell>{wo.comment}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditClick(wo)}
                                            sx={{mr: 1}}
                                            title={t('editWorkOrder')}
                                        >
                                            <LinkIcon fontSize="small"/>
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => openScheduleModal(wo)}
                                            sx={{mr: 1}}
                                            title={t('scheduleOnMachine')}
                                        >
                                            <AddIcon fontSize="small"/>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDeleteClick(wo)}
                                                    title={t('deleteWorkOrder')}
                                        >
                                            <DeleteIcon fontSize="small"/>
                                        </IconButton>
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
                            <Button variant="contained" color="primary" onClick={handleSubmit}>
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
                            {t('workOrder')}: {scheduleWorkOrder?.id ?? '—'}
                        </Typography>
                        <TextField
                            select
                            label={t('machine')}
                            value={scheduleMachineId ?? ''}
                            onChange={(e) => setScheduleMachineId(e.target.value ? Number(e.target.value) : undefined)}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {machines.map((m) => (
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
                            <Button variant="contained" color="primary" onClick={handleScheduleSubmit}>
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
