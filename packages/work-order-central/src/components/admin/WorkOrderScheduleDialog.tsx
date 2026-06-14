import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { WorkOrderTO, PurchaseOrderTO, ProductOrderTO, MachineTO, MachineBookingTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

function nowLocalDateTimeForInput(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    const tzOffsetMs = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function workOrderLineDisplay(wo: WorkOrderTO): string {
    const ref = wo.productReference?.trim();
    const name = wo.productName?.trim();
    const parts = [ref, name].filter(Boolean);
    if (parts.length) return parts.join(' · ');
    return wo.productOrderId != null ? `#${wo.productOrderId}` : '—';
}

function findLineContext(
    wo: WorkOrderTO,
    purchaseOrders: PurchaseOrderTO[],
): { line: ProductOrderTO; po: PurchaseOrderTO } | null {
    if (wo.productOrderId == null) return null;
    for (const po of purchaseOrders) {
        const line = po.productOrderList?.find((l) => l.id === wo.productOrderId);
        if (line) return { line, po };
    }
    return null;
}

function getProductMachineIdsForSchedule(
    wo: WorkOrderTO | null | undefined,
    purchaseOrders: PurchaseOrderTO[],
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

function purchaseOrderLabel(po: PurchaseOrderTO): string {
    const lines = po.productOrderList || [];
    const cat =
        lines.map((l) => l.product?.reference).find((r) => r && r.trim() !== '') ||
        lines[0]?.product?.name ||
        '';
    const cust = po.customer?.companyName || '';
    const core = cat || `#${po.id}`;
    return cust ? `${core} (${cust})` : core;
}

type Props = {
    open: boolean;
    workOrder: WorkOrderTO | null;
    purchaseOrders: PurchaseOrderTO[];
    machines: MachineTO[];
    onClose: () => void;
    onScheduled: () => void;
};

export function WorkOrderScheduleDialog({ open, workOrder, purchaseOrders, machines, onClose, onScheduled }: Props) {
    const { t } = useTranslation();
    const [scheduleMachineId, setScheduleMachineId] = useState<number | undefined>(undefined);
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');
    const [scheduleType, setScheduleType] = useState<'PRODUCTION' | 'MAINTENANCE' | 'SETUP' | 'OTHER'>('PRODUCTION');
    const [scheduleError, setScheduleError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setScheduleMachineId(undefined);
        setScheduleStart('');
        setScheduleEnd('');
        setScheduleType('PRODUCTION');
        setScheduleError(null);
    }, [open, workOrder?.id]);

    const scheduleProductMachines = useMemo(
        () => getProductMachineIdsForSchedule(workOrder, purchaseOrders),
        [workOrder, purchaseOrders],
    );

    const machinesForSchedulePicker = useMemo(() => {
        const allowed = new Set(scheduleProductMachines.ids);
        if (allowed.size === 0) return [];
        return machines.filter((m) => m.id != null && allowed.has(m.id));
    }, [machines, scheduleProductMachines.ids]);

    const scheduleMinDateTime = nowLocalDateTimeForInput();

    const scheduleMachineHelperText = (() => {
        if (!workOrder) return '';
        if (workOrder.productOrderId == null) {
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

    const handleScheduleSubmit = () => {
        if (!workOrder?.id || !scheduleStart || !scheduleEnd) {
            setScheduleError(t('allFieldsRequired'));
            return;
        }
        const now = new Date();
        const start = new Date(scheduleStart);
        const end = new Date(scheduleEnd);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            setScheduleError(t('allFieldsRequired'));
            return;
        }
        if (start.getTime() < now.getTime() || end.getTime() < now.getTime()) {
            setScheduleError(t('scheduleDateTimePastNotAllowed'));
            return;
        }
        const allowed = new Set(scheduleProductMachines.ids);
        if (!scheduleProductMachines.lineFound || workOrder.productOrderId == null) {
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
            workOrderId: workOrder.id,
            startDateTime: scheduleStart,
            endDateTime: scheduleEnd,
            type: scheduleType,
            comment: undefined,
        };
        Server.addMachineBooking(
            booking,
            () => {
                toastActionSuccess(t('toastWorkOrderScheduled'));
                onScheduled();
                onClose();
            },
            (err: unknown) => {
                const body = (err as { response?: { data?: unknown } })?.response?.data;
                setScheduleError(typeof body === 'string' ? body : t('errorSchedulingMachine'));
                toastServerError(err, t);
            },
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('scheduleMachineForWorkOrder')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <Typography variant="body2">
                        {t('purchaseOrder')}:{' '}
                        {workOrder?.purchaseOrderId != null
                            ? purchaseOrderLabel(
                                  purchaseOrders.find((p) => p.id === workOrder.purchaseOrderId) || {
                                      id: workOrder.purchaseOrderId,
                                  },
                              )
                            : '—'}
                    </Typography>
                    <Typography variant="body2">
                        {t('productOrderLine')}: {workOrder ? workOrderLineDisplay(workOrder) : '—'}
                    </Typography>
                    <Typography variant="body2">
                        {t('workOrder')}: {workOrder?.id ?? '—'}
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
                                color: machinesForSchedulePicker.length === 0 ? 'error.main' : 'text.secondary',
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
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ lang: 'en-GB', min: scheduleMinDateTime }}
                    />
                    <TextField
                        label={t('endDateTime')}
                        type="datetime-local"
                        value={scheduleEnd}
                        onChange={(e) => setScheduleEnd(e.target.value)}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ lang: 'en-GB', min: scheduleMinDateTime }}
                    />
                    <TextField
                        select
                        label={t('bookingType')}
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value as typeof scheduleType)}
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
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleScheduleSubmit}
                            disabled={machinesForSchedulePicker.length === 0 || scheduleMachineId == null}
                        >
                            {t('schedule')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
