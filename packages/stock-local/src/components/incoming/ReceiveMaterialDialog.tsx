import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderLineTO, MaterialOrderReceptionTO, MaterialOrderTO, StockLocationTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import { ReceiveMaterialStockAllocationSection } from './ReceiveMaterialStockAllocationSection';
import {
    buildStockAllocationsPayload,
    isReceiveFormValid,
    newAllocationRow,
    parseReceivedQuantity,
    type StockAllocationRow,
} from './materialReceptionStockAllocation';

function toDatetimeLocalValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toServerDateTime(localValue: string): string {
    if (!localValue) return '';
    return localValue.length === 16 ? `${localValue}:00` : localValue;
}

function lineMaterialLabel(line: MaterialOrderLineTO, order: MaterialOrderTO): string {
    return line.materialName?.trim() || line.materialCode?.trim() || order.materialName || order.materialCode || '—';
}

function remainingQuantity(line: MaterialOrderLineTO): number {
    if (line.remainingQuantity != null) {
        return Math.max(0, line.remainingQuantity);
    }
    const ordered = line.quantity ?? 0;
    const received = line.receivedQuantityTotal ?? 0;
    return Math.max(0, ordered - received);
}

type Props = {
    open: boolean;
    order: MaterialOrderTO | null;
    line: MaterialOrderLineTO | null;
    stockLocations: StockLocationTO[];
    onClose: () => void;
    onReceived: (saved: MaterialOrderReceptionTO, order: MaterialOrderTO, line: MaterialOrderLineTO) => void;
};

export function ReceiveMaterialDialog({ open, order, line, stockLocations, onClose, onReceived }: Props) {
    const { t } = useTranslation();
    const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
    const [receivedAt, setReceivedAt] = useState('');
    const [receivedQuantity, setReceivedQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [allocationRows, setAllocationRows] = useState<StockAllocationRow[]>([newAllocationRow()]);

    const maxQuantity = useMemo(() => (line ? remainingQuantity(line) : 0), [line]);

    useEffect(() => {
        if (!open || !line) return;
        setDeliveryNoteNumber('');
        setReceivedAt(toDatetimeLocalValue(new Date()));
        setReceivedQuantity(String(maxQuantity > 0 ? maxQuantity : ''));
        setAllocationRows([newAllocationRow()]);
    }, [open, line?.id, line?.materialId, maxQuantity]);

    const receivedQtyParsed = parseReceivedQuantity(receivedQuantity);
    const canConfirm =
        order?.id != null &&
        line != null &&
        maxQuantity > 0 &&
        isReceiveFormValid({
            receivedQuantity,
            maxQuantity,
            deliveryNoteNumber,
            allocationRows,
        });

    const quantityHelperText =
        maxQuantity <= 0
            ? t('materialLineFullyReceived')
            : maxQuantity === line?.quantity
              ? t('receivedQuantityBatchWhole', { max: maxQuantity })
              : t('receivedQuantityBatchPartial', { received: line?.receivedQuantityTotal ?? 0, ordered: line?.quantity ?? 0, max: maxQuantity });

    const confirmReceive = () => {
        if (!order?.id || !line || !canConfirm) return;
        const qty = receivedQtyParsed;
        if (qty == null) return;
        setSubmitting(true);
        Server.recordMaterialOrderReception(
            {
                materialOrderId: order.id,
                materialOrderLineId: line.id,
                deliveryNoteNumber: deliveryNoteNumber.trim(),
                receivedAt: toServerDateTime(receivedAt),
                receivedQuantity: qty,
                stockAllocations: buildStockAllocationsPayload(allocationRows),
            },
            (response: unknown) => {
                setSubmitting(false);
                const saved = (response as { data?: MaterialOrderReceptionTO })?.data;
                onClose();
                if (saved) onReceived(saved, order, line);
            },
            () => setSubmitting(false),
        );
    };

    return (
        <Dialog open={open && order != null && line != null} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{t('receiveMaterialDialogTitle')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    {order?.code ? `${order.code} — ` : ''}
                    {line && order ? lineMaterialLabel(line, order) : ''} — {order?.materialProviderName}
                </Typography>
                <TextField
                    label={t('deliveryNoteNumber')}
                    value={deliveryNoteNumber}
                    onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                    fullWidth
                    required
                />
                <TextField
                    label={t('receptionDate')}
                    type="datetime-local"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                />
                <TextField
                    label={t('receivedQuantity')}
                    type="number"
                    value={receivedQuantity}
                    onChange={(e) => setReceivedQuantity(e.target.value)}
                    fullWidth
                    inputProps={{ min: 1, max: maxQuantity > 0 ? maxQuantity : undefined }}
                    helperText={quantityHelperText}
                    disabled={maxQuantity <= 0}
                />
                <ReceiveMaterialStockAllocationSection
                    rows={allocationRows}
                    stockLocations={stockLocations}
                    receivedQuantity={receivedQtyParsed}
                    onRowsChange={setAllocationRows}
                    onAddRow={() => setAllocationRows((prev) => [...prev, newAllocationRow()])}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>{t('cancel')}</Button>
                <Button variant="contained" onClick={confirmReceive} disabled={submitting || !canConfirm}>
                    {t('confirmAction')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
