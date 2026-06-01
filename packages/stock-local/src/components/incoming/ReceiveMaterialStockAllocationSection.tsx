import {
    Box,
    Button,
    IconButton,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { StockLocationTO } from 'sf-common/src/models/ApiRequests';
import {
    type StockAllocationRow,
    sumAllocationQuantities,
} from './materialReceptionStockAllocation';

type Props = {
    rows: StockAllocationRow[];
    stockLocations: StockLocationTO[];
    receivedQuantity: number | null;
    onRowsChange: (rows: StockAllocationRow[]) => void;
    onAddRow: () => void;
};

export function ReceiveMaterialStockAllocationSection({
    rows,
    stockLocations,
    receivedQuantity,
    onRowsChange,
    onAddRow,
}: Props) {
    const { t } = useTranslation();

    const allocated = sumAllocationQuantities(rows);
    const remaining =
        receivedQuantity != null ? Math.max(0, receivedQuantity - allocated) : null;

    const updateRow = (key: string, patch: Partial<StockAllocationRow>) => {
        onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    };

    const removeRow = (key: string) => {
        onRowsChange(rows.filter((r) => r.key !== key));
    };

    const usedLocationIds = new Set(
        rows.map((r) => r.stockLocationId).filter((id): id is number => id !== ''),
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle2">{t('receiveStockAllocationTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
                {t('receiveStockAllocationHint')}
            </Typography>
            {stockLocations.length === 0 ? (
                <Typography variant="body2" color="error">
                    {t('receiveStockAllocationNoLocations')}
                </Typography>
            ) : (
                rows.map((row) => (
                    <Box key={row.key} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <TextField
                            select
                            label={t('stockLocationCode')}
                            value={row.stockLocationId === '' ? '' : row.stockLocationId}
                            onChange={(e) =>
                                updateRow(row.key, {
                                    stockLocationId: e.target.value ? Number(e.target.value) : '',
                                })
                            }
                            size="small"
                            sx={{ flex: 1 }}
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {stockLocations.map((loc) => (
                                <MenuItem
                                    key={loc.id}
                                    value={loc.id}
                                    disabled={
                                        loc.id != null &&
                                        loc.id !== row.stockLocationId &&
                                        usedLocationIds.has(loc.id)
                                    }
                                >
                                    {loc.stockLocationCode || loc.id}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label={t('quantity')}
                            type="number"
                            value={row.quantity}
                            onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                            size="small"
                            sx={{ width: 120 }}
                            inputProps={{ min: 1 }}
                        />
                        <IconButton
                            size="small"
                            aria-label={t('removeStockAllocationRow')}
                            onClick={() => removeRow(row.key)}
                            disabled={rows.length <= 1}
                            sx={{ mt: 0.5 }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                ))
            )}
            <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={onAddRow}
                disabled={stockLocations.length === 0}
                sx={{ alignSelf: 'flex-start' }}
            >
                {t('addStockAllocationRow')}
            </Button>
            {receivedQuantity != null && (
                <Typography
                    variant="body2"
                    color={remaining === 0 ? 'success.main' : 'warning.main'}
                >
                    {t('receiveStockAllocationProgress', {
                        allocated,
                        total: receivedQuantity,
                        remaining: remaining ?? 0,
                    })}
                </Typography>
            )}
        </Box>
    );
}
