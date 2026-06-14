import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

export type PurchaseOrderSearchFiltersForm = {
    status: string;
    periodFrom: string;
    periodTo: string;
};

type Props = {
    initialFilters: PurchaseOrderSearchFiltersForm;
    statusOptions: readonly string[];
    resultCount: number;
    totalCount: number;
    onApply: (filters: PurchaseOrderSearchFiltersForm) => void;
    statusLabel: (status: string, t: TFunction) => string;
};

export function PurchaseOrderSearchFilters({
    initialFilters,
    statusOptions,
    resultCount,
    totalCount,
    onApply,
    statusLabel,
}: Props) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<PurchaseOrderSearchFiltersForm>(initialFilters);

    useEffect(() => {
        setDraft(initialFilters);
    }, [initialFilters]);

    return (
        <Box
            component="form"
            autoComplete="off"
            onSubmit={(e) => {
                e.preventDefault();
                onApply(draft);
            }}
            sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}
        >
            <TextField
                select
                label={t('purchaseOrderStatusFilter')}
                value={draft.status}
                onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
                size="small"
                sx={{ minWidth: 180 }}
            >
                <MenuItem value="ALL">{t('purchaseOrderStatusFilterAll')}</MenuItem>
                {statusOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                        {statusLabel(s, t)}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                label={t('dateFrom')}
                type="date"
                value={draft.periodFrom}
                onChange={(e) => setDraft((prev) => ({ ...prev, periodFrom: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
            />
            <TextField
                label={t('dateUntil')}
                type="date"
                value={draft.periodTo}
                onChange={(e) => setDraft((prev) => ({ ...prev, periodTo: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
            />
            <Button type="submit" variant="contained">
                {t('searchAction')}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                {t('purchaseOrderFilterCount', { count: resultCount, total: totalCount })}
            </Typography>
        </Box>
    );
}
