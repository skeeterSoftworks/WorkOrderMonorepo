import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import type { StockLocationTO } from 'sf-common/src/models/ApiRequests';

type Props = {
    editingLocation: StockLocationTO | null;
    onSubmit: (stockLocationCode: string) => void;
    onCancelEdit: () => void;
};

export function StockLocationFormSection({ editingLocation, onSubmit, onCancelEdit }: Props) {
    const { t } = useTranslation();
    const [stockLocationCode, setStockLocationCode] = useState('');

    useEffect(() => {
        setStockLocationCode(editingLocation?.stockLocationCode ?? '');
    }, [editingLocation?.id, editingLocation?.stockLocationCode]);

    const isFormValid = Boolean(stockLocationCode.trim());

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            <TextField
                required
                label={t('stockLocationCode')}
                value={stockLocationCode}
                onChange={(e) => setStockLocationCode(e.target.value)}
                size="small"
                sx={{ maxWidth: 320 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={() => onSubmit(stockLocationCode.trim())} disabled={!isFormValid}>
                    {editingLocation ? t('updateStockLocation') : t('addStockLocation')}
                </Button>
                {editingLocation && (
                    <Button variant="outlined" onClick={onCancelEdit}>{t('cancel')}</Button>
                )}
            </Box>
        </Box>
    );
}
