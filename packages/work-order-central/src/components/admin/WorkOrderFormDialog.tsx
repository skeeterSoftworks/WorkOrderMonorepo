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
import Alert from '@mui/material/Alert';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type {
    WorkOrderTO,
    PurchaseOrderTO,
    ProductOrderTO,
    WorkOrderCreateResultTO,
    WorkOrderMaterialRequirementsTO,
} from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { downloadBase64Pdf } from '../../util/downloadBase64Pdf';
import {
    buildWorkOrderStockAssignmentsPayload,
    isWorkOrderStockAssignmentValid,
} from '../../util/workOrderStockAllocation';

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

function readLoggedInUserQr(): string | undefined {
    const raw = sessionStorage.getItem('userData');
    if (!raw) return undefined;
    try {
        const user = JSON.parse(raw) as { qrCode?: string };
        const qr = user.qrCode?.trim();
        return qr || undefined;
    } catch {
        return undefined;
    }
}

function materialRequirementLineLabel(
    line: { materialCode?: string; materialName?: string; missingQuantity?: number; unitOfMeasure?: string },
    t: (key: string) => string,
): string {
    const name = [line.materialCode?.trim(), line.materialName?.trim()].filter(Boolean).join(' · ') || '—';
    const unit = line.unitOfMeasure ? t(`unitOfMeasure_${line.unitOfMeasure}`) : '';
    const missing = line.missingQuantity ?? 0;
    const qty = Number.isInteger(missing) ? String(missing) : missing.toFixed(3).replace(/\.?0+$/, '');
    return unit ? `${name}: ${qty} ${unit}` : `${name}: ${qty}`;
}

function formatRequirementQuantity(value: number | undefined, unit: string | undefined, t: (key: string) => string): string {
    if (value == null) return '—';
    const qty = Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
    const unitLabel = unit ? t(`unitOfMeasure_${unit}`) : '';
    return unitLabel ? `${qty} ${unitLabel}` : qty;
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
    const [productStockAvailable, setProductStockAvailable] = useState(0);
    const [productStockLoading, setProductStockLoading] = useState(false);
    const [stockAssignQuantity, setStockAssignQuantity] = useState('');
    const [materialRequirements, setMaterialRequirements] = useState<WorkOrderMaterialRequirementsTO | null>(null);
    const [materialRequirementsLoading, setMaterialRequirementsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const selectableLines = useMemo(
        () => getSelectableProductLines(purchaseOrderId, purchaseOrders, workOrders, editingId),
        [purchaseOrderId, purchaseOrders, workOrders, editingId],
    );

    const selectedProductLine = useMemo(() => {
        if (productOrderLineId == null) return undefined;
        return selectableLines.find((line) => line.id === productOrderLineId);
    }, [productOrderLineId, selectableLines]);

    const selectedProductId = selectedProductLine?.product?.id;
    const requiredQuantity = selectedProductLine?.quantity;
    const stockAssignmentsPayload = buildWorkOrderStockAssignmentsPayload(stockAssignQuantity);
    const stockAllocationValid = isWorkOrderStockAssignmentValid({
        quantityRaw: stockAssignQuantity,
        availableQuantity: productStockAvailable,
        requiredQuantity,
    });

    const willGenerateStockAssignmentOrder =
        editingId == null && stockAssignmentsPayload.length > 0;

    const willGenerateMaterialRequirementsReport = editingId == null && productOrderLineId != null;

    const missingMaterialLines = useMemo(
        () =>
            (materialRequirements?.lines ?? []).filter(
                (line) => (line.missingQuantity ?? 0) > 0.000_001,
            ),
        [materialRequirements],
    );

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

    useEffect(() => {
        if (!open || editingId) {
            setProductStockAvailable(0);
            setStockAssignQuantity('');
            return;
        }
        if (selectedProductId == null || !Number.isFinite(selectedProductId)) {
            setProductStockAvailable(0);
            setStockAssignQuantity('');
            return;
        }
        setProductStockLoading(true);
        setStockAssignQuantity('');
        Server.getProductStockAvailabilityForProduct(
            selectedProductId,
            (response: { data?: { availableQuantity?: number } }) => {
                setProductStockAvailable(response?.data?.availableQuantity ?? 0);
                setProductStockLoading(false);
            },
            () => {
                setProductStockAvailable(0);
                setProductStockLoading(false);
            },
        );
    }, [open, editingId, selectedProductId]);

    useEffect(() => {
        if (!open || editingId != null) {
            setMaterialRequirements(null);
            setMaterialRequirementsLoading(false);
            return;
        }
        if (selectedProductId == null || requiredQuantity == null || requiredQuantity <= 0) {
            setMaterialRequirements(null);
            setMaterialRequirementsLoading(false);
            return;
        }
        setMaterialRequirementsLoading(true);
        Server.previewWorkOrderMaterialRequirements(
            selectedProductId,
            requiredQuantity,
            (response: { data?: WorkOrderMaterialRequirementsTO }) => {
                setMaterialRequirements(response?.data ?? null);
                setMaterialRequirementsLoading(false);
            },
            () => {
                setMaterialRequirements(null);
                setMaterialRequirementsLoading(false);
            },
        );
    }, [open, editingId, selectedProductId, requiredQuantity]);

    useEffect(() => {
        if (!open) {
            setSubmitting(false);
        }
    }, [open]);

    const handleSubmit = () => {
        if (productOrderLineId == null || !stockAllocationValid || submitting) return;
        setSubmitting(true);
        const payload: WorkOrderTO = {
            id: editingId,
            productOrderId: productOrderLineId,
            dueDate: dueDate || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            comment: comment || undefined,
            stockAssignments: stockAssignmentsPayload.length > 0 ? stockAssignmentsPayload : undefined,
            createdByUserQrCode: readLoggedInUserQr(),
        };
        const onSuccess = (response?: { data?: WorkOrderCreateResultTO }) => {
            const materialPdf = response?.data?.materialRequirementsPdfBase64;
            if (materialPdf) {
                const workOrderId = response?.data?.workOrder?.id;
                downloadBase64Pdf(
                    materialPdf,
                    `material-requirements-${workOrderId ?? 'new'}.pdf`,
                );
            }
            const pdf = response?.data?.stockAssignmentOrderPdfBase64;
            if (pdf) {
                const workOrderId = response?.data?.workOrder?.id;
                downloadBase64Pdf(
                    pdf,
                    `stock-assignment-order-${workOrderId ?? 'new'}.pdf`,
                );
            }
            setSubmitting(false);
            onSaved();
            onClose();
            if (!editingId && missingMaterialLines.length > 0) {
                toastActionSuccess(t('toastWorkOrderAddedWithMaterialShortage'));
            } else {
                toastActionSuccess(editingId ? t('toastWorkOrderUpdated') : t('toastWorkOrderAdded'));
            }
        };
        const onError = (err: unknown) => {
            setSubmitting(false);
            toastServerError(err, t);
        };
        if (editingId) {
            Server.editWorkOrder(payload, onSuccess, onError);
        } else {
            Server.addWorkOrder(payload, onSuccess, onError);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {editingId ? t('editWorkOrder') : t('createNewWorkOrder')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')} disabled={submitting}>
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
                    {!editingId && productOrderLineId != null && (
                        <>
                            {productStockLoading ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={20} />
                                    <Typography variant="body2" color="text.secondary">
                                        {t('workOrderStockAvailabilityChecking')}
                                    </Typography>
                                </Box>
                            ) : productStockAvailable > 0 ? (
                                <>
                                    <Alert severity="info">
                                        {t('workOrderStockAvailableNotice', {
                                            quantity: productStockAvailable,
                                        })}
                                    </Alert>
                                    <TextField
                                        label={t('workOrderStockAssignQuantity')}
                                        type="number"
                                        value={stockAssignQuantity}
                                        onChange={(e) => setStockAssignQuantity(e.target.value)}
                                        size="small"
                                        fullWidth
                                        inputProps={{ min: 1, max: productStockAvailable }}
                                        helperText={t('workOrderStockAssignmentHint')}
                                    />
                                </>
                            ) : null}
                        </>
                    )}
                    {!editingId && productOrderLineId != null && (
                        <>
                            {materialRequirementsLoading ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={20} />
                                    <Typography variant="body2" color="text.secondary">
                                        {t('workOrderMaterialRequirementsChecking')}
                                    </Typography>
                                </Box>
                            ) : materialRequirements?.hasBillOfMaterials === false ? (
                                <Alert severity="info">{t('workOrderMaterialRequirementsNoBom')}</Alert>
                            ) : materialRequirements?.fullyAvailable ? (
                                <Alert severity="success">{t('workOrderMaterialRequirementsFullyAvailable')}</Alert>
                            ) : missingMaterialLines.length > 0 ? (
                                <Alert severity="warning">
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        {t('workOrderMaterialRequirementsShortageNotice')}
                                    </Typography>
                                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                                        {missingMaterialLines.map((line) => (
                                            <Box component="li" key={line.materialId ?? `${line.materialCode}-${line.materialName}`}>
                                                <Typography variant="body2">
                                                    {materialRequirementLineLabel(line, t)}
                                                    {' '}
                                                    ({t('workOrderMaterialRequirementsRequiredAvailable', {
                                                        required: formatRequirementQuantity(
                                                            line.requiredQuantity,
                                                            line.unitOfMeasure,
                                                            t,
                                                        ),
                                                        available: formatRequirementQuantity(
                                                            line.availableQuantity,
                                                            line.unitOfMeasure,
                                                            t,
                                                        ),
                                                    })})
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Alert>
                            ) : null}
                        </>
                    )}
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
                            disabled={productOrderLineId == null || !stockAllocationValid || submitting}
                        >
                            {editingId ? t('editWorkOrder') : t('addWorkOrder')}
                        </Button>
                        <Button variant="outlined" onClick={onClose} disabled={submitting}>
                            {t('cancel')}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
            <Backdrop
                open={submitting}
                sx={{
                    color: '#fff',
                    zIndex: (theme) => theme.zIndex.modal + 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <CircularProgress color="inherit" />
                <Typography variant="body1" component="p">
                    {willGenerateStockAssignmentOrder
                        ? t('generatingStockAssignmentOrder')
                        : willGenerateMaterialRequirementsReport
                          ? t('generatingMaterialRequirementsReport')
                          : t('loadingDetails')}
                </Typography>
            </Backdrop>
        </>
    );
}
