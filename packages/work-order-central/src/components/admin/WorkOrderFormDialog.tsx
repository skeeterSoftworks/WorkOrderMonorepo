import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { WorkOrderTO, PurchaseOrderTO, ProductOrderTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

function purchaseOrderDeliveryToDueDateInput(deliveryDate: PurchaseOrderTO['deliveryDate']): string {
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

function getSelectableProductLines(
    purchaseOrderId: number | undefined,
    purchaseOrders: PurchaseOrderTO[],
    workOrders: WorkOrderTO[],
    editingWorkOrderId: number | undefined,
): ProductOrderTO[] {
    if (purchaseOrderId == null) return [];
    const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
    const lines = (po?.productOrderList ?? []).filter((l) => l.id != null) as ProductOrderTO[];
    const usedLineIds = new Set(
        workOrders
            .filter((w) => editingWorkOrderId == null || w.id !== editingWorkOrderId)
            .map((w) => w.productOrderId)
            .filter((id): id is number => id != null),
    );
    const editing = editingWorkOrderId != null ? workOrders.find((w) => w.id === editingWorkOrderId) : undefined;
    return lines.filter(
        (l) =>
            l.id != null &&
            (!usedLineIds.has(l.id) || (editing?.productOrderId != null && l.id === editing.productOrderId)),
    );
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
    presetPurchaseOrderId?: number;
    purchaseOrders: PurchaseOrderTO[];
    workOrders: WorkOrderTO[];
    onClose: () => void;
    onSaved: () => void;
};

export function WorkOrderFormDialog({
    open,
    workOrder,
    presetPurchaseOrderId,
    purchaseOrders,
    workOrders,
    onClose,
    onSaved,
}: Props) {
    const { t } = useTranslation();
    const editingId = workOrder?.id;

    const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>(undefined);
    const [productOrderLineId, setProductOrderLineId] = useState<number | undefined>(undefined);
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (!open) return;
        if (workOrder?.id != null) {
            let poId = workOrder.purchaseOrderId;
            if (poId == null && workOrder.productOrderId != null) {
                const po = purchaseOrders.find((p) =>
                    (p.productOrderList ?? []).some((l) => l.id === workOrder.productOrderId),
                );
                poId = po?.id;
            }
            setPurchaseOrderId(poId);
            setProductOrderLineId(workOrder.productOrderId);
            setDueDate(workOrder.dueDate ? workOrder.dueDate.substring(0, 10) : '');
            setStartDate(workOrder.startDate ? workOrder.startDate.substring(0, 10) : '');
            setEndDate(workOrder.endDate ? workOrder.endDate.substring(0, 10) : '');
            setComment(workOrder.comment || '');
            return;
        }
        const poId = presetPurchaseOrderId;
        setPurchaseOrderId(poId);
        setProductOrderLineId(undefined);
        setStartDate('');
        setEndDate('');
        setComment('');
        if (poId != null) {
            const po = purchaseOrders.find((p) => p.id === poId);
            setDueDate(po ? purchaseOrderDeliveryToDueDateInput(po.deliveryDate) : '');
        } else {
            setDueDate('');
        }
    }, [open, workOrder?.id, presetPurchaseOrderId, purchaseOrders]);

    useEffect(() => {
        if (!open || editingId) return;
        if (!purchaseOrderId) {
            setDueDate('');
            return;
        }
        const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
        setDueDate(po ? purchaseOrderDeliveryToDueDateInput(po.deliveryDate) : '');
    }, [open, editingId, purchaseOrderId, purchaseOrders]);

    const selectableLines = useMemo(
        () => getSelectableProductLines(purchaseOrderId, purchaseOrders, workOrders, editingId),
        [purchaseOrderId, purchaseOrders, workOrders, editingId],
    );

    const handleSubmit = () => {
        if (productOrderLineId == null) return;
        const payload: WorkOrderTO = {
            id: editingId,
            productOrderId: productOrderLineId,
            dueDate: dueDate || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            comment: comment || undefined,
        };
        const onSuccess = () => {
            onSaved();
            onClose();
            toastActionSuccess(editingId ? t('toastWorkOrderUpdated') : t('toastWorkOrderAdded'));
        };
        if (editingId) {
            Server.editWorkOrder(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addWorkOrder(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {editingId ? t('editWorkOrder') : t('createNewWorkOrder')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box component="form" autoComplete="off" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        select
                        label={t('purchaseOrder')}
                        value={purchaseOrderId ?? ''}
                        onChange={(e) => {
                            const id = e.target.value ? Number(e.target.value) : undefined;
                            setPurchaseOrderId(id);
                            setProductOrderLineId(undefined);
                            if (!editingId) {
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
                        {selectableLines.map((line) => (
                            <MenuItem key={line.id} value={line.id}>
                                {productOrderLineLabel(line)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label={t('dueDate')}
                        type="date"
                        value={dueDate}
                        onChange={editingId ? (e) => setDueDate(e.target.value) : () => {}}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        InputProps={editingId ? undefined : { readOnly: true }}
                        inputProps={{ lang: 'en-GB' }}
                        helperText={!editingId ? t('dueDateFromPurchaseOrderDelivery') : undefined}
                    />
                    <TextField
                        label={t('startDate')}
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ lang: 'en-GB' }}
                    />
                    <TextField
                        label={t('endDate')}
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ lang: 'en-GB' }}
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
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={productOrderLineId == null}
                        >
                            {editingId ? t('editWorkOrder') : t('addWorkOrder')}
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
