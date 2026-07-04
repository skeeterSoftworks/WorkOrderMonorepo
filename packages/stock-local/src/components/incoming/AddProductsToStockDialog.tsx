import { useEffect, useMemo, useState } from 'react';
import {
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
} from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import { productStockIntakeUnitLabel } from './productStockIntakeDisplay';

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

export function AddProductsToStockDialog({ open, catalog, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [productId, setProductId] = useState<number | ''>('');
    const [stickerNumber, setStickerNumber] = useState('');
    const [unitOfMeasure, setUnitOfMeasure] = useState<ProductStockIntakeUnitOfMeasure>('PIECES');
    const [quantity, setQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const sortedCatalog = useMemo(
        () => [...catalog].sort((a, b) => (a.reference ?? '').localeCompare(b.reference ?? '', undefined, { sensitivity: 'base' })),
        [catalog],
    );

    useEffect(() => {
        if (!open) {
            return;
        }
        setProductId('');
        setStickerNumber('');
        setUnitOfMeasure('PIECES');
        setQuantity('');
    }, [open]);

    const quantityParsed = parseQuantity(quantity);
    const canConfirm = typeof productId === 'number' && productId > 0 && quantityParsed != null;

    const confirmAdd = () => {
        if (!canConfirm) {
            return;
        }
        setSubmitting(true);
        Server.recordProductStockIntake(
            {
                productId,
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
