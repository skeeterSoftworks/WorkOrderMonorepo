import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    PRODUCT_STOCK_INTAKE_UNITS_OF_MEASURE,
    type ProductCatalogEntryTO,
    type ProductStockIntakeTO,
    type ProductStockIntakeUnitOfMeasure,
    type ProductStockIntakeWorkOrderOptionTO,
} from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import {
    computeSurplusQuantityPreview,
    formatProductStockIntakeQuantity,
    productStockIntakeUnitLabel,
    productStockIntakeWorkOrderLabel,
} from './productStockIntakeDisplay';

type Props = {
    open: boolean;
    catalog: ProductCatalogEntryTO[];
    onClose: () => void;
    onSaved: (saved: ProductStockIntakeTO) => void;
};

function parseQuantity(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        return null;
    }
    return parsed;
}

function parseWorkOrdersResponse(response: unknown): ProductStockIntakeWorkOrderOptionTO[] {
    const r = response as { data?: ProductStockIntakeWorkOrderOptionTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

export function AddProductsToStockDialog({ open, catalog, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [productId, setProductId] = useState<number | ''>('');
    const [workOrderId, setWorkOrderId] = useState<number | ''>('');
    const [workOrders, setWorkOrders] = useState<ProductStockIntakeWorkOrderOptionTO[]>([]);
    const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
    const [stickerNumber, setStickerNumber] = useState('');
    const [unitOfMeasure, setUnitOfMeasure] = useState<ProductStockIntakeUnitOfMeasure>('PIECES');
    const [quantity, setQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const sortedCatalog = useMemo(
        () => [...catalog].sort((a, b) => (a.reference ?? '').localeCompare(b.reference ?? '', undefined, { sensitivity: 'base' })),
        [catalog],
    );

    const selectedWorkOrder = useMemo(
        () => workOrders.find((wo) => wo.id === workOrderId),
        [workOrders, workOrderId],
    );

    useEffect(() => {
        if (!open) {
            return;
        }
        setProductId('');
        setWorkOrderId('');
        setWorkOrders([]);
        setStickerNumber('');
        setUnitOfMeasure('PIECES');
        setQuantity('');
    }, [open]);

    useEffect(() => {
        if (!open || typeof productId !== 'number' || productId <= 0) {
            setWorkOrders([]);
            setWorkOrderId('');
            return;
        }
        setLoadingWorkOrders(true);
        setWorkOrderId('');
        Server.getProductStockIntakeWorkOrders(
            productId,
            (response: unknown) => {
                setWorkOrders(parseWorkOrdersResponse(response));
                setLoadingWorkOrders(false);
            },
            () => {
                setWorkOrders([]);
                setLoadingWorkOrders(false);
            },
        );
    }, [open, productId]);

    const quantityParsed = parseQuantity(quantity);
    const surplusPreview = computeSurplusQuantityPreview(selectedWorkOrder, quantityParsed ?? 0);
    const canConfirm =
        typeof productId === 'number'
        && productId > 0
        && typeof workOrderId === 'number'
        && workOrderId > 0
        && quantityParsed != null;

    const confirmAdd = () => {
        if (!canConfirm) {
            return;
        }
        setSubmitting(true);
        Server.recordProductStockIntake(
            {
                productId,
                workOrderId,
                stickerNumber: stickerNumber.trim() || undefined,
                unitOfMeasure,
                quantity: quantityParsed,
            },
            (response: unknown) => {
                setSubmitting(false);
                const saved = (response as { data?: ProductStockIntakeTO })?.data;
                onClose();
                if (saved) {
                    onSaved(saved);
                }
            },
            () => setSubmitting(false),
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t('addProductsToStock')}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('addProductsToStockDescription')}
                </Typography>
                <FormControl fullWidth margin="normal" required>
                    <InputLabel id="product-reference-label">{t('productReference')}</InputLabel>
                    <Select
                        labelId="product-reference-label"
                        label={t('productReference')}
                        value={productId}
                        onChange={(event) => setProductId(event.target.value as number | '')}
                    >
                        {sortedCatalog.length === 0 ? (
                            <MenuItem disabled value="">
                                {t('incomingProductsNoCatalog')}
                            </MenuItem>
                        ) : (
                            sortedCatalog.map((entry) => (
                                <MenuItem key={entry.id} value={entry.id ?? ''}>
                                    {entry.reference || entry.name || `#${entry.id}`}
                                </MenuItem>
                            ))
                        )}
                    </Select>
                </FormControl>
                <FormControl fullWidth margin="normal" required disabled={typeof productId !== 'number' || loadingWorkOrders}>
                    <InputLabel id="product-stock-work-order-label">{t('workOrder')}</InputLabel>
                    <Select
                        labelId="product-stock-work-order-label"
                        label={t('workOrder')}
                        value={workOrderId}
                        onChange={(event) => setWorkOrderId(event.target.value as number | '')}
                    >
                        {loadingWorkOrders ? (
                            <MenuItem disabled value="">
                                {t('loading')}
                            </MenuItem>
                        ) : workOrders.length === 0 ? (
                            <MenuItem disabled value="">
                                {t('productStockIntakeNoWorkOrders')}
                            </MenuItem>
                        ) : (
                            workOrders.map((wo) => (
                                <MenuItem key={wo.id} value={wo.id ?? ''}>
                                    {productStockIntakeWorkOrderLabel(wo, t)}
                                </MenuItem>
                            ))
                        )}
                    </Select>
                </FormControl>
                <TextField
                    fullWidth
                    margin="normal"
                    label={t('stickerNumber')}
                    value={stickerNumber}
                    onChange={(event) => setStickerNumber(event.target.value)}
                />
                <Stack direction="row" spacing={2}>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel id="product-uom-label">{t('productMaterialUnitOfMeasure')}</InputLabel>
                        <Select
                            labelId="product-uom-label"
                            label={t('productMaterialUnitOfMeasure')}
                            value={unitOfMeasure}
                            onChange={(event) => setUnitOfMeasure(event.target.value as ProductStockIntakeUnitOfMeasure)}
                        >
                            {PRODUCT_STOCK_INTAKE_UNITS_OF_MEASURE.map((unit) => (
                                <MenuItem key={unit} value={unit}>
                                    {productStockIntakeUnitLabel(unit, t)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        required
                        type="number"
                        inputProps={{ min: 1, step: 1 }}
                        label={t('quantity')}
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                    />
                </Stack>
                {selectedWorkOrder?.internalStockDemand && (
                    <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                        {t('productStockIntakeInternalWorkOrderHint')}
                    </Alert>
                )}
                {canConfirm && surplusPreview > 0 && (
                    <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                        {t('productStockIntakeSurplusPreview', {
                            surplus: formatProductStockIntakeQuantity(surplusPreview, unitOfMeasure, t),
                        })}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={submitting}>
                    {t('cancel')}
                </Button>
                <Button variant="contained" onClick={confirmAdd} disabled={!canConfirm || submitting}>
                    {t('confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
